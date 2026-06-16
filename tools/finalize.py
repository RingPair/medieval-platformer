#!/usr/bin/env python
"""Process the chosen Replicate generations into game-ready assets in public/assets/.

This is the deterministic "curation" step: it slices hero/enemy walk sheets to their
right-facing row, resizes seamless tiles to the grid size, and trims single sprites
to their opaque bounding box. Re-runnable; safe to re-run after regenerating sources.
"""
import os
import numpy as np
from PIL import Image

E = "assets/raw/explore"
OUT = "public/assets"
TILE = 32


def fade_top(im, fade_px):
    """Ramp the top `fade_px` rows of alpha to 0 so a parallax layer dissolves
    into the sky instead of showing a hard horizontal cut where the image ends."""
    im = im.convert("RGBA")
    a = np.array(im).astype(np.float32)
    ramp = np.ones(im.height, dtype=np.float32)
    for y in range(min(fade_px, im.height)):
        ramp[y] = (y / fade_px) ** 0.8
    a[:, :, 3] *= ramp[:, None]
    return Image.fromarray(np.clip(a, 0, 255).astype("uint8"), "RGBA")


def save(im, path):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    im.save(path)
    print(f"  {path}  {im.size}")


def trim(im, pad=1):
    im = im.convert("RGBA")
    bbox = im.split()[-1].getbbox()
    if bbox:
        l, t, r, b = bbox
        l = max(0, l - pad); t = max(0, t - pad)
        r = min(im.width, r + pad); b = min(im.height, b + pad)
        im = im.crop((l, t, r, b))
    return im


def row_strip(src, dst, row=3, fw=48, fh=48, cols=4):
    """Extract one direction-row from a four_angle_walking sheet as a horizontal strip."""
    im = Image.open(src).convert("RGBA")
    strip = im.crop((0, row * fh, cols * fw, (row + 1) * fh))
    save(strip, dst)


def tile(src, name, size=TILE):
    im = Image.open(src).convert("RGBA").resize((size, size), Image.LANCZOS)
    save(im, f"{OUT}/tiles/{name}.png")


def single(src, name, sub="props"):
    save(trim(Image.open(src)), f"{OUT}/{sub}/{name}.png")


print("HERO + ENEMIES (right-facing walk row -> 4-frame strip):")
row_strip(f"{E}/hero/knight-a.png", f"{OUT}/hero/knight.png")
row_strip(f"{E}/enemy/goblin.png", f"{OUT}/enemy/goblin.png")
row_strip(f"{E}/enemy/slime.png", f"{OUT}/enemy/slime.png")

print("TILES (seamless -> %dpx grid):" % TILE)
tile(f"{E}/tiles2/grasstop-d.png", "grass")
tile(f"{E}/tiles2/dirt-seam.png", "dirt")
tile(f"{E}/tiles2/stone-seam.png", "stone")

print("COLLECTIBLES + PROPS (single, trimmed):")
single(f"{E}/props2/coin-a.png", "coin")
single(f"{E}/props2/heart-a.png", "heart")
single(f"{E}/props2/gem-a.png", "gem")
single(f"{E}/props2/chest-a.png", "chest")
single(f"{E}/props2/banner-a.png", "banner")

print("DECORATIONS + HAZARDS (single, trimmed):")
single(f"{E}/deco/tree.png", "tree", "deco")
single(f"{E}/props2/bush-a.png", "bush", "deco")
single(f"{E}/deco/rock.png", "rock", "deco")
single(f"{E}/deco/sign.png", "sign", "deco")
single(f"{E}/deco/spikes.png", "spikes", "deco")
single(f"{E}/deco/torch.png", "torch", "deco")
single(f"{E}/bg2/castle-far.png", "castle", "deco")

print("BACKGROUND PARALLAX LAYERS (top edge faded into sky):")
save(fade_top(Image.open(f"{E}/bg2/hills-sil.png"), 42), f"{OUT}/bg/hills-far.png")
save(fade_top(Image.open(f"{E}/bg2/hills-near.png"), 34), f"{OUT}/bg/hills-near.png")

print("UI:")
fav = Image.open(f"{E}/props2/coin-a.png").convert("RGBA").resize((32, 32), Image.LANCZOS)
save(fav, f"{OUT}/ui/favicon.png")

print("Done.")
