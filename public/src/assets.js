// Asset manifest + loader. Every sprite here is AI-generated (Retro Diffusion on
// Replicate) and processed by tools/finalize.py into public/assets/.
export const TILE = 32;          // world tile size in pixels
export const VIEW_W = 480;       // internal render resolution (scaled up, pixel-perfect)
export const VIEW_H = 270;

// Animated, frame-sliced sprite sheets (horizontal strips of fw×fh frames).
export const SHEETS = {
  hero:   { src: "assets/hero/knight.png", fw: 48, fh: 48,
            anims: { idle: { f: [1], fps: 1 }, run: { f: [0, 1, 2, 3], fps: 11 },
                     jump: { f: [0], fps: 1 }, fall: { f: [2], fps: 1 } } },
  goblin: { src: "assets/enemy/goblin.png", fw: 48, fh: 48,
            anims: { walk: { f: [0, 1, 2, 3], fps: 8 } } },
  slime:  { src: "assets/enemy/slime.png", fw: 48, fh: 48,
            anims: { walk: { f: [0, 1, 2, 3], fps: 6 } } },
};

// Single-image assets.
export const IMAGES = {
  grass: "assets/tiles/grass.png",
  dirt: "assets/tiles/dirt.png",
  stone: "assets/tiles/stone.png",
  coin: "assets/props/coin.png",
  heart: "assets/props/heart.png",
  gem: "assets/props/gem.png",
  chest: "assets/props/chest.png",
  banner: "assets/props/banner.png",
  tree: "assets/deco/tree.png",
  bush: "assets/deco/bush.png",
  rock: "assets/deco/rock.png",
  sign: "assets/deco/sign.png",
  spikes: "assets/deco/spikes.png",
  torch: "assets/deco/torch.png",
  castle: "assets/deco/castle.png",
  hillsFar: "assets/bg/hills-far.png",
  hillsNear: "assets/bg/hills-near.png",
};

const loadImage = (src) =>
  new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = () => rej(new Error(`Failed to load ${src}`));
    img.src = src;
  });

// Pre-slice a sheet into an array of per-frame canvases for fast drawing + flipping.
function sliceFrames(img, fw, fh) {
  const cols = Math.max(1, Math.floor(img.width / fw));
  const frames = [];
  for (let i = 0; i < cols; i++) {
    const c = document.createElement("canvas");
    c.width = fw; c.height = fh;
    const g = c.getContext("2d");
    g.imageSmoothingEnabled = false;
    g.drawImage(img, i * fw, 0, fw, fh, 0, 0, fw, fh);
    // pre-build a horizontally flipped copy
    const cf = document.createElement("canvas");
    cf.width = fw; cf.height = fh;
    const gf = cf.getContext("2d");
    gf.imageSmoothingEnabled = false;
    gf.translate(fw, 0); gf.scale(-1, 1);
    gf.drawImage(c, 0, 0);
    frames.push({ normal: c, flipped: cf });
  }
  return frames;
}

// Loads everything, reporting progress. Returns { images, sheets }.
export async function loadAssets(onProgress) {
  const imgEntries = Object.entries(IMAGES);
  const sheetEntries = Object.entries(SHEETS);
  const total = imgEntries.length + sheetEntries.length;
  let done = 0;
  const bump = (label) => { done++; onProgress?.(done / total, label); };

  const images = {};
  const sheets = {};

  await Promise.all([
    ...imgEntries.map(async ([k, src]) => { images[k] = await loadImage(src); bump(k); }),
    ...sheetEntries.map(async ([k, def]) => {
      const img = await loadImage(def.src);
      sheets[k] = { ...def, frames: sliceFrames(img, def.fw, def.fh) };
      bump(k);
    }),
  ]);

  return { images, sheets };
}
