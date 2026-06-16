# Knight's Quest 🏰

A small, pretty **2D medieval platformer** that runs in the browser — built with a
hand-written vanilla-Canvas engine and deployed on **Cloudflare Workers**.

**Every single art asset is AI-generated** with [Replicate](https://replicate.com),
using the purpose-built [Retro Diffusion](https://replicate.com/retro-diffusion) pixel-art
models. No art was hand-drawn or downloaded — the repo contains the exact scripts and
prompts that produced the sprites, tiles, parallax layers, and props.

Run · jump · stomp goblins · collect coins & gems · reach the castle banner.

---

## Play

- **Move:** ← → or A / D
- **Jump:** ↑, W, or Space (hold for a higher jump)
- **Restart:** R
- Touch controls appear automatically on phones/tablets.

```bash
npm install
npm run dev        # wrangler dev — serve the game locally
# or, for fast iteration with no caching:
node tools/devserver.mjs 8080
```

Then open the printed URL.

---

## How the art was made (the interesting part)

All assets come from the **Retro Diffusion** model family on Replicate, chosen after
testing the field of 2D-asset models — it is purpose-built for grid-aligned, limited-palette
pixel art and is far more controllable than general Flux/SDXL for game sprites.

| Asset | Model | Style | Notes |
|---|---|---|---|
| Hero & enemy animation | `retro-diffusion/rd-animation` | `four_angle_walking` | Outputs a 4-direction, 4-frame walk sheet (192×192). The **side-facing row** is sliced out as the run cycle; idle/jump/fall are derived from it + engine squash-stretch, so every frame is perfectly consistent. |
| Ground / platform tiles | `retro-diffusion/rd-plus` | `mc_texture`, `textured` | Seamless tiles via `tile_x`/`tile_y`. |
| Collectibles & props | `retro-diffusion/rd-plus` | `skill_icon`, `default` | Single, centered, transparent sprites (`remove_bg`). |
| Parallax backdrops | `retro-diffusion/rd-plus` | `environment` | Wide, horizontally-tileable hill/mountain layers + a castle landmark. |

The pipeline (`tools/`):

1. **`replicate.mjs`** — thin Replicate API harness (create prediction → wait → download), with rate-limit retries.
2. **`explore.mjs` / `explore2.mjs`** — fire a matrix of prompt/style/seed variants concurrently so the best recipe can be picked per asset type.
3. **`imgtools.py`** — inspect, upscale-preview, build labeled contact-sheets, and slice sprite sheets (Pillow).
4. **`finalize.py`** — the deterministic curation step: slices the hero/enemy walk rows, resizes tiles to the 32 px grid, trims single sprites to their opaque bbox, and writes everything game-ready into `public/assets/`.

### Regenerate every asset from scratch

```bash
cp .env.example .env        # add your REPLICATE_API_TOKEN
npm run gen                 # node --env-file=.env tools/explore.mjs all
node --env-file=.env tools/explore2.mjs
python tools/finalize.py    # slice/trim/resize into public/assets/
```

---

## The game engine

A dependency-free engine in `public/src/` (ES modules, ~10 small files):

- **`physics.js`** — per-axis tile AABB collision (no tunneling).
- **`player.js`** — run/jump feel: acceleration, friction, **coyote time**, **jump buffering**, variable-height jump, squash-&-stretch juice.
- **`level.js`** — the level as a structured, hand-tuned definition (terrain spans, platforms, pits, entities). An auto-playtester verified it is completable end-to-end.
- **`enemy.js`** — patrolling goblins/slimes that turn at walls and ledges; stomp to defeat, side-touch to take damage.
- **`game.js`** — world, parallax sky/hills/clouds, collisions, checkpoints (pit-falls respawn for 1 HP), HUD, win/lose.
- **`particles.js`**, **`camera.js`** (follow + shake), **`audio.js`** (procedural WebAudio SFX — no audio files), **`input.js`** (keyboard + touch).

Internal render resolution is a fixed 480×270, scaled up pixel-perfect.

---

## Deployment (Cloudflare Workers)

The game is served as a **static-assets Worker** (`wrangler.jsonc` → `assets.directory: ./public`).

```bash
cp .env.example .env        # add your CLOUDFLARE_API_TOKEN
npm run deploy              # npx wrangler deploy
```

---

## License & credits

Art generated with Retro Diffusion on Replicate. Engine and code are MIT-licensed —
do whatever you like.
