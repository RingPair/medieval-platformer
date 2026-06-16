#!/usr/bin/env python
"""Pixel-art image toolkit for the asset pipeline.

Subcommands:
  info <img...>                         print size/mode/opaque bbox for each image
  preview <scale> <img...>              nearest-neighbour upscale -> <name>_xN.png (for inspection)
  montage <out.png> <cell> <label img>...  labeled contact sheet (each cell upscaled to fit `cell`)
  grid <img> <cols> <rows> <outdir> <prefix>  slice into cols*rows equal cells -> prefix_r_c.png
  row  <img> <frameW> <frameH> <rowIndex> <outdir> <prefix>  extract one row of frames
  trim <img> <out>                      crop to opaque bounding box
"""
import sys, os
from PIL import Image, ImageDraw, ImageFont


def _font(size=14):
    try:
        return ImageFont.truetype("arial.ttf", size)
    except Exception:
        return ImageFont.load_default()


def opaque_bbox(im):
    if im.mode != "RGBA":
        return (0, 0, im.width, im.height)
    alpha = im.split()[-1]
    return alpha.getbbox()


def info(args):
    for p in args:
        im = Image.open(p)
        bbox = opaque_bbox(im.convert("RGBA"))
        print(f"{p}: size={im.size} mode={im.mode} opaque_bbox={bbox}")


def preview(args):
    scale = int(args[0])
    for p in args[1:]:
        im = Image.open(p).convert("RGBA")
        up = im.resize((im.width * scale, im.height * scale), Image.NEAREST)
        base, _ = os.path.splitext(p)
        out = f"{base}_x{scale}.png"
        up.save(out)
        print(out)


def montage(args):
    out = args[0]
    cell = int(args[1])
    pairs = args[2:]
    items = [(pairs[i], pairs[i + 1]) for i in range(0, len(pairs), 2)]
    cols = min(4, len(items)) or 1
    rows = (len(items) + cols - 1) // cols
    pad, label_h = 10, 20
    cw, ch = cell + pad * 2, cell + label_h + pad * 2
    canvas = Image.new("RGBA", (cols * cw, rows * ch), (32, 32, 40, 255))
    draw = ImageDraw.Draw(canvas)
    font = _font(13)
    # checkerboard so transparency is visible
    def checker(size):
        c = Image.new("RGBA", (size, size), (90, 90, 100, 255))
        d = ImageDraw.Draw(c)
        s = 8
        for y in range(0, size, s):
            for x in range(0, size, s):
                if (x // s + y // s) % 2 == 0:
                    d.rectangle([x, y, x + s, y + s], fill=(120, 120, 130, 255))
        return c
    bg = checker(cell)
    for idx, (label, path) in enumerate(items):
        r, c = divmod(idx, cols)
        x0, y0 = c * cw + pad, r * ch + pad + label_h
        im = Image.open(path).convert("RGBA")
        scale = max(1, min(cell // max(im.width, 1), cell // max(im.height, 1)))
        if scale < 1:
            scale = 1
        up = im.resize((im.width * scale, im.height * scale), Image.NEAREST)
        if up.width > cell or up.height > cell:
            up.thumbnail((cell, cell), Image.NEAREST)
        cellbg = bg.copy()
        ox = (cell - up.width) // 2
        oy = (cell - up.height) // 2
        cellbg.alpha_composite(up, (ox, oy))
        canvas.alpha_composite(cellbg, (x0, y0))
        draw.text((c * cw + pad, r * ch + pad), label, fill=(235, 235, 245, 255), font=font)
    canvas.save(out)
    print(f"{out} ({cols}x{rows} cells)")


def grid(args):
    img, cols, rows, outdir, prefix = args[0], int(args[1]), int(args[2]), args[3], args[4]
    im = Image.open(img).convert("RGBA")
    fw, fh = im.width // cols, im.height // rows
    os.makedirs(outdir, exist_ok=True)
    for r in range(rows):
        for c in range(cols):
            cell = im.crop((c * fw, r * fh, (c + 1) * fw, (r + 1) * fh))
            cell.save(os.path.join(outdir, f"{prefix}_{r}_{c}.png"))
    print(f"sliced {cols*rows} cells of {fw}x{fh} -> {outdir}")


def row(args):
    img, fw, fh, ridx, outdir, prefix = args[0], int(args[1]), int(args[2]), int(args[3]), args[4], args[5]
    im = Image.open(img).convert("RGBA")
    cols = im.width // fw
    os.makedirs(outdir, exist_ok=True)
    for c in range(cols):
        cell = im.crop((c * fw, ridx * fh, (c + 1) * fw, (ridx + 1) * fh))
        cell.save(os.path.join(outdir, f"{prefix}_{c}.png"))
    print(f"extracted row {ridx}: {cols} frames of {fw}x{fh} -> {outdir}")


def trim(args):
    im = Image.open(args[0]).convert("RGBA")
    bbox = opaque_bbox(im)
    if bbox:
        im = im.crop(bbox)
    im.save(args[1])
    print(f"{args[1]} {im.size}")


CMDS = {"info": info, "preview": preview, "montage": montage, "grid": grid, "row": row, "trim": trim}

if __name__ == "__main__":
    if len(sys.argv) < 2 or sys.argv[1] not in CMDS:
        print(__doc__)
        sys.exit(1)
    CMDS[sys.argv[1]](sys.argv[2:])
