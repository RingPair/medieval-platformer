// Tile-based AABB physics. Bodies are {x,y,w,h,vx,vy,onGround}. We integrate and
// resolve one axis at a time against the level's solid grid — the classic, robust
// approach that avoids tunneling for sub-tile-speed movement.
import { TILE } from "./assets.js";

const f = Math.floor;

export function moveAndCollide(level, b, dt) {
  b.onGround = false;
  let hitWall = 0;

  // ---- Horizontal ----
  b.x += b.vx * dt;
  let r0 = f(b.y / TILE), r1 = f((b.y + b.h - 1) / TILE);
  if (b.vx > 0) {
    const c = f((b.x + b.w) / TILE);
    for (let r = r0; r <= r1; r++) if (level.solidAt(c, r)) { b.x = c * TILE - b.w; b.vx = 0; hitWall = 1; break; }
  } else if (b.vx < 0) {
    const c = f(b.x / TILE);
    for (let r = r0; r <= r1; r++) if (level.solidAt(c, r)) { b.x = (c + 1) * TILE; b.vx = 0; hitWall = -1; break; }
  }

  // ---- Vertical ----
  b.y += b.vy * dt;
  let c0 = f(b.x / TILE), c1 = f((b.x + b.w - 1) / TILE);
  if (b.vy > 0) {
    const r = f((b.y + b.h) / TILE);
    for (let c = c0; c <= c1; c++) if (level.solidAt(c, r)) { b.y = r * TILE - b.h; b.vy = 0; b.onGround = true; break; }
  } else if (b.vy < 0) {
    const r = f(b.y / TILE);
    for (let c = c0; c <= c1; c++) if (level.solidAt(c, r)) { b.y = (r + 1) * TILE; b.vy = 0; break; }
  }

  b.hitWall = hitWall;
  return b;
}

// Will a body standing at (x,y) have ground directly under its leading edge?
// Used by enemies to turn around at ledges.
export function groundAhead(level, b, dir) {
  const footY = f((b.y + b.h + 1) / TILE);
  const aheadX = dir > 0 ? f((b.x + b.w + 2) / TILE) : f((b.x - 2) / TILE);
  return level.solidAt(aheadX, footY);
}
