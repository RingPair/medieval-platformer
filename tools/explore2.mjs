// Round-3: single-sprite collectibles (default/skill_icon styles give ONE object,
// unlike item_sheet which packs a grid).
import { generate } from "./replicate.mjs";
const OUT = "assets/raw/explore/props2";
const JOBS = [
  ["retro-diffusion/rd-plus", "coin-a", { prompt: "a single shiny round gold coin with a star stamped on it, front view, glowing fantasy game collectible", style: "skill_icon", width: 48, height: 48, remove_bg: true, seed: 300 }],
  ["retro-diffusion/rd-plus", "coin-b", { prompt: "a single shiny gold coin, front facing, thick golden rim, fantasy currency, clean", style: "default", width: 48, height: 48, remove_bg: true, seed: 301 }],
  ["retro-diffusion/rd-plus", "heart-a", { prompt: "a single glossy bright red heart, smooth, game life health icon", style: "skill_icon", width: 48, height: 48, remove_bg: true, seed: 302 }],
  ["retro-diffusion/rd-plus", "heart-b", { prompt: "a single cute red heart with a white shine, game health pickup", style: "default", width: 48, height: 48, remove_bg: true, seed: 303 }],
  ["retro-diffusion/rd-plus", "gem-a", { prompt: "a single brilliant cut blue sapphire diamond gem, sparkling, fantasy treasure collectible", style: "default", width: 48, height: 48, remove_bg: true, seed: 304 }],
  ["retro-diffusion/rd-plus", "chest-a", { prompt: "a single closed wooden treasure chest with gold trim and a brass lock, medieval, three-quarter view", style: "default", width: 64, height: 64, remove_bg: true, seed: 305 }],
  ["retro-diffusion/rd-plus", "banner-a", { prompt: "a tall medieval flag banner, blue triangular pennant with a gold crown emblem, on a wooden pole, level goal marker", style: "default", width: 96, height: 128, remove_bg: true, seed: 306 }],
  ["retro-diffusion/rd-plus", "bush-a", { prompt: "a single small round leafy green bush shrub, clean, game decoration", style: "default", width: 96, height: 64, remove_bg: true, seed: 307 }],
];
const results = await Promise.all(JOBS.map(async ([m, n, i]) => {
  try { const r = await generate(m, i, OUT, n); console.log(`✓ ${n} -> ${r.files[0]}`); return r; }
  catch (e) { console.error(`✗ ${n}: ${e.message.split("\n")[0]}`); return null; }
}));
console.log(`Done: ${results.filter(Boolean).length}/${JOBS.length}`);
