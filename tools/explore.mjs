// Prompt-exploration harness: fire a curated matrix of candidate generations
// concurrently so we can pick the best recipe per asset type.
//   node --env-file=.env tools/explore.mjs [category|all]
import { generate } from "./replicate.mjs";

const OUT = "assets/raw/explore";

// ---- Candidate matrix -------------------------------------------------------
// Each job: { model, name, input }. Grouped by category.
const M = {
  // Hero walk sheets — lock the cleanest knight. four_angle_walking = 48px, 4x4.
  hero: [
    ["retro-diffusion/rd-animation", "knight-a", { prompt: "a heroic knight in shining silver plate armor with a flowing blue cape, brave hero", style: "four_angle_walking", width: 48, height: 48, return_spritesheet: true, seed: 1234 }],
    ["retro-diffusion/rd-animation", "knight-b", { prompt: "young knight hero, blue tunic, leather armor, brown boots, no helmet, short brown hair, side view friendly", style: "four_angle_walking", width: 48, height: 48, return_spritesheet: true, seed: 55 }],
    ["retro-diffusion/rd-animation", "knight-c", { prompt: "a knight adventurer with a round shield and silver helmet, blue cape, fantasy hero", style: "four_angle_walking", width: 48, height: 48, return_spritesheet: true, seed: 808 }],
    ["retro-diffusion/rd-animation", "knight-d", { prompt: "brave knight in blue and silver armor, red plume on helmet, heroic fantasy character", style: "four_angle_walking", width: 48, height: 48, return_spritesheet: true, seed: 4242 }],
  ],

  // Enemies — walk sheets for side-view patrol enemies.
  enemy: [
    ["retro-diffusion/rd-animation", "goblin", { prompt: "a small green goblin enemy with a wooden club, pointy ears, angry, fantasy monster", style: "four_angle_walking", width: 48, height: 48, return_spritesheet: true, seed: 9 }],
    ["retro-diffusion/rd-animation", "skeleton", { prompt: "a walking skeleton warrior with a rusty sword, undead enemy, white bones", style: "four_angle_walking", width: 48, height: 48, return_spritesheet: true, seed: 17 }],
    ["retro-diffusion/rd-animation", "slime", { prompt: "a cute bouncing green slime blob monster with eyes", style: "four_angle_walking", width: 48, height: 48, return_spritesheet: true, seed: 33 }],
    ["retro-diffusion/rd-animation", "bat", { prompt: "a small purple flying bat enemy with fangs and wings", style: "vfx", width: 48, height: 48, return_spritesheet: true, seed: 41 }],
  ],

  // Ground & platform tiles.
  tiles: [
    ["retro-diffusion/rd-tile", "grass-wang", { prompt: "lush green grass on top of brown dirt, medieval platformer ground", style: "tileset", width: 32, height: 32, seed: 7 }],
    ["retro-diffusion/rd-tile", "grass-single", { prompt: "lush green grass surface tile with dirt underneath, seamless ground", style: "single_tile", width: 32, height: 32, seed: 7 }],
    ["retro-diffusion/rd-tile", "dirt-single", { prompt: "brown packed dirt and small rocks, underground soil, seamless", style: "single_tile", width: 32, height: 32, seed: 8 }],
    ["retro-diffusion/rd-tile", "stone-single", { prompt: "grey cobblestone castle brick wall, medieval stone blocks, seamless", style: "single_tile", width: 32, height: 32, seed: 12 }],
    ["retro-diffusion/rd-tile", "wood-single", { prompt: "wooden plank platform, brown timber boards, medieval, seamless", style: "single_tile", width: 32, height: 32, seed: 14 }],
  ],

  // Parallax background layers — wide, horizontally tileable.
  bg: [
    ["retro-diffusion/rd-plus", "sky", { prompt: "pixel art sky gradient, soft blue to pale, fluffy white clouds, peaceful daytime, parallax background layer, no ground", style: "environment", width: 384, height: 216, tile_x: true, seed: 3 }],
    ["retro-diffusion/rd-plus", "hills-far", { prompt: "distant rolling green hills and faint blue mountains silhouette on a transparent background, far parallax layer, no sky", style: "environment", width: 384, height: 160, tile_x: true, remove_bg: true, seed: 5 }],
    ["retro-diffusion/rd-plus", "castle-mid", { prompt: "a majestic medieval castle with towers on a green hill, pine trees, midground parallax layer on transparent background", style: "environment", width: 384, height: 200, tile_x: true, remove_bg: true, seed: 6 }],
    ["retro-diffusion/rd-plus", "trees-near", { prompt: "a row of lush green pine and oak trees and bushes, foreground parallax layer on transparent background, no sky", style: "environment", width: 384, height: 180, tile_x: true, remove_bg: true, seed: 8 }],
  ],

  // Collectibles & props.
  props: [
    ["retro-diffusion/rd-plus", "coin-spin", { prompt: "a single shiny gold coin spinning, 4 rotation frames from front to side to edge, animation sheet, gold currency", style: "item_sheet", width: 192, height: 48, remove_bg: true, seed: 21 }],
    ["retro-diffusion/rd-plus", "gem", { prompt: "a single sparkling blue diamond gem crystal, fantasy treasure", style: "item_sheet", width: 64, height: 64, remove_bg: true, seed: 22 }],
    ["retro-diffusion/rd-plus", "heart", { prompt: "a single red heart life icon, glossy, game UI health", style: "item_sheet", width: 64, height: 64, remove_bg: true, seed: 23 }],
    ["retro-diffusion/rd-plus", "key", { prompt: "a single golden old key, medieval treasure key", style: "item_sheet", width: 64, height: 64, remove_bg: true, seed: 24 }],
    ["retro-diffusion/rd-plus", "flag", { prompt: "a checkered victory flag on a wooden pole planted in the ground, level goal marker", style: "default", width: 96, height: 128, remove_bg: true, seed: 25 }],
    ["retro-diffusion/rd-plus", "chest", { prompt: "a closed wooden treasure chest with gold trim and a lock, medieval", style: "item_sheet", width: 96, height: 96, remove_bg: true, seed: 26 }],
  ],

  // ROUND 2 — proper side-view platformer ground tiles (seamless via tile_x/tile_y).
  tiles2: [
    ["retro-diffusion/rd-plus", "grasstop-a", { prompt: "side view platformer terrain block tile, a band of lush green grass with short blades along the top edge, solid brown dirt and small pebbles filling the area below, pixel art, seamless left and right", style: "default", width: 48, height: 48, tile_x: true, seed: 100 }],
    ["retro-diffusion/rd-plus", "grasstop-b", { prompt: "platformer ground tile cross section, bright green grass top surface, packed brown earth below, cartoon pixel art, tileable horizontally", style: "cartoon", width: 48, height: 48, tile_x: true, seed: 101 }],
    ["retro-diffusion/rd-tile", "grasstop-c", { prompt: "side-view platformer ground, green grass on the top, brown dirt below, cross section cliff edge tile", style: "single_tile", width: 48, height: 48, seed: 102 }],
    ["retro-diffusion/rd-plus", "dirt-seam", { prompt: "seamless tileable brown dirt soil texture with small stones and roots, underground earth, pixel art", style: "mc_texture", width: 48, height: 48, tile_x: true, tile_y: true, seed: 103 }],
    ["retro-diffusion/rd-plus", "stone-seam", { prompt: "seamless tileable grey medieval castle stone brick wall, mortar lines, pixel art", style: "mc_texture", width: 48, height: 48, tile_x: true, tile_y: true, seed: 104 }],
    ["retro-diffusion/rd-plus", "grasstop-d", { prompt: "lush green grass turf on top of a thick layer of brown dirt with rocks, platformer floor block seen from the side, clean pixel art, seamless tiling left to right", style: "textured", width: 48, height: 48, tile_x: true, seed: 105 }],
  ],

  // ROUND 2 — clean wide parallax backdrops (no foreground framing).
  bg2: [
    ["retro-diffusion/rd-plus", "backdrop-a", { prompt: "wide panoramic medieval fantasy landscape, distant castle on rolling green hills, pine forest, layered blue mountains, soft pastel blue sky with fluffy white clouds, peaceful, parallax game background, no foreground objects, no frame, no arch", style: "environment", width: 480, height: 270, tile_x: true, seed: 200 }],
    ["retro-diffusion/rd-plus", "backdrop-b", { prompt: "serene medieval countryside background, green meadows and far hills, a fairytale castle in the misty distance, warm morning sky, pixel art parallax scenery, no foreground, seamless", style: "environment", width: 480, height: 270, tile_x: true, seed: 201 }],
    ["retro-diffusion/rd-plus", "hills-sil", { prompt: "a wide seamless band of distant rolling forested hills and pine trees as a flat silhouette, simple soft shapes, parallax midground layer, transparent sky above", style: "environment", width: 480, height: 140, tile_x: true, remove_bg: true, seed: 202 }],
    ["retro-diffusion/rd-plus", "clouds", { prompt: "a few soft fluffy white pixel art clouds scattered, transparent background, parallax cloud layer", style: "environment", width: 256, height: 120, tile_x: true, remove_bg: true, seed: 203 }],
  ],

  // Decorations & hazards.
  deco: [
    ["retro-diffusion/rd-plus", "tree", { prompt: "a single lush green oak tree with brown trunk, pixel art game decoration", style: "default", width: 128, height: 160, remove_bg: true, seed: 31 }],
    ["retro-diffusion/rd-plus", "bush", { prompt: "a single small round green bush shrub, game decoration", style: "default", width: 96, height: 64, remove_bg: true, seed: 32 }],
    ["retro-diffusion/rd-plus", "rock", { prompt: "a single grey mossy boulder rock, game decoration", style: "default", width: 96, height: 64, remove_bg: true, seed: 33 }],
    ["retro-diffusion/rd-plus", "sign", { prompt: "a wooden directional signpost, medieval village sign, game decoration", style: "default", width: 96, height: 96, remove_bg: true, seed: 34 }],
    ["retro-diffusion/rd-plus", "spikes", { prompt: "a row of sharp grey metal spikes pointing up, danger hazard trap, seamless", style: "default", width: 96, height: 48, remove_bg: true, seed: 35 }],
    ["retro-diffusion/rd-plus", "torch", { prompt: "a wooden torch with orange flame mounted on a wall, medieval lighting", style: "default", width: 48, height: 96, remove_bg: true, seed: 36 }],
  ],
};

const limit = (n) => {
  let active = 0;
  const queue = [];
  const next = () => { active--; if (queue.length) queue.shift()(); };
  return (fn) => new Promise((res, rej) => {
    const run = () => { active++; fn().then(res, rej).finally(next); };
    active < n ? run() : queue.push(run);
  });
};

const run = async (categories) => {
  const lim = limit(4);
  const jobs = [];
  for (const cat of categories) {
    for (const [model, name, input] of M[cat]) {
      jobs.push(lim(async () => {
        const t0 = Date.now();
        try {
          const r = await generate(model, input, `${OUT}/${cat}`, name);
          console.log(`✓ ${cat}/${name} (${((Date.now() - t0) / 1000).toFixed(0)}s) -> ${r.files.join(", ")}`);
          return { cat, name, ok: true, files: r.files };
        } catch (e) {
          console.error(`✗ ${cat}/${name}: ${e.message.split("\n")[0]}`);
          return { cat, name, ok: false, error: e.message.split("\n")[0] };
        }
      }));
    }
  }
  const results = await Promise.all(jobs);
  const ok = results.filter((r) => r.ok).length;
  console.log(`\n=== Done: ${ok}/${results.length} succeeded ===`);
  for (const r of results.filter((r) => !r.ok)) console.log(`  FAILED ${r.cat}/${r.name}: ${r.error}`);
};

const arg = process.argv[2] || "all";
const categories = arg === "all" ? Object.keys(M) : arg.split(",").filter((c) => M[c]);
if (!categories.length) { console.error(`Unknown category. Options: ${Object.keys(M).join(", ")}, all`); process.exit(1); }
console.log(`Exploring: ${categories.join(", ")}`);
await run(categories);
