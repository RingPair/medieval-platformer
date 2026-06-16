// Level built from a structured, hand-tuned definition (far easier to design and
// balance than aligned ASCII). Produces a collision grid + entity list.
import { TILE } from "./assets.js";

const ROWS = 14;

// Ground surface spans: [fromCol, toCol, topRow] (inclusive). Solid from topRow..bottom.
// Gaps between spans are BOTTOMLESS PITS. A lower topRow = higher ground.
const TERRAIN = [
  [0, 15, 11],     // start plateau
  // pit 16-17
  [18, 30, 11],    // goblin plateau
  [31, 62, 11],    // long stretch: gem stairs, spikes, slime meadow
  // pit 63-70 (stepping stones)
  [71, 90, 11],    // goblin + spikes section
  [91, 123, 9],    // castle plateau (raised — 2-tile step up)
];

// Floating stone platforms: [col, topRow, length]. Kept ≥2 tiles above the
// ground beneath them (or used as ledges to jump onto), never head-knockers.
const PLATFORMS = [
  [22, 8, 3],                          // coins, walk under
  [33, 9, 3], [37, 7, 3], [41, 5, 3],  // ascending stairs to the gem
  [54, 8, 3],                          // float in the meadow
  [64, 9, 2], [67, 8, 2],              // stepping stones over the pit
];

// Entities placed at tile coords. r = tile row of the cell.
const COINS = [
  [8, 9], [9, 9], [10, 9],                 // intro arc
  [16, 8], [17, 8],                        // over first pit
  [22, 7], [23, 7], [24, 7],               // on platform
  [27, 9], [28, 9],
  [33, 8], [37, 6], [41, 4],               // up the stairs
  [46, 9], [47, 8], [48, 9],               // arc over the spikes
  [52, 9], [54, 7], [60, 9],               // meadow
  [64, 8], [67, 7],                        // stepping stones
  [74, 9], [77, 9],                        // goblin run
  [92, 7], [96, 7], [100, 7], [104, 6], [109, 7], // castle run to the goal
];
const GEMS = [[41, 4]];
const HEARTS = [[57, 9]];
const ENEMIES = [
  ["goblin", 24, 11], ["slime", 52, 11], ["slime", 58, 11],
  ["goblin", 76, 11], ["goblin", 102, 9],
];
const SPIKES = [[46, 11], [47, 11], [48, 11], [79, 11], [80, 11]];
const DECO = [
  ["tree", 6, 11, { back: true }], ["bush", 13, 11], ["sign", 4, 11],
  ["rock", 29, 11], ["tree", 50, 11, { back: true }], ["bush", 61, 11],
  ["rock", 73, 11], ["castle", 107, 9, { back: true, scale: 1.4 }],
  ["torch", 95, 9], ["torch", 116, 9],
];
const CHESTS = [[119, 9]];
const SPAWN_COL = 2;
const GOAL_COL = 112, GOAL_ROW = 9;

export class Level {
  constructor() {
    this.rows = ROWS;
    this.cols = 124;
    this.w = this.cols * TILE;
    this.h = this.rows * TILE;
    this.tiles = Array.from({ length: this.rows }, () => new Array(this.cols).fill(0));
    this.entities = [];

    for (const [from, to, top] of TERRAIN)
      for (let c = from; c <= to; c++)
        for (let r = top; r < this.rows; r++) this.tiles[r][c] = 1;

    for (const [col, row, len] of PLATFORMS)
      for (let c = col; c < col + len; c++) if (c < this.cols) this.tiles[row][c] = 2;

    // grass cap = ground tile (type 1) with nothing solid directly above
    this.cap = this.tiles.map((tr, r) =>
      tr.map((t, c) => (t === 1 && !(r > 0 && this.tiles[r - 1][c]) ? 1 : 0))
    );

    // depth = how many solid tiles sit directly above this one (0 = surface).
    // Used to darken deeper soil so the underground reads as a cross-section.
    this.depth = this.tiles.map((tr, r) =>
      tr.map((t, c) => {
        if (!t) return 0;
        let d = 0, rr = r - 1;
        while (rr >= 0 && this.tiles[rr][c]) { d++; rr--; }
        return d;
      })
    );

    const cx = (c) => c * TILE + TILE / 2;
    const top = (r) => r * TILE;
    const bottom = (r) => (r + 1) * TILE;

    this.spawn = { x: SPAWN_COL * TILE, y: top(10) - TILE };
    for (const [c, r] of COINS) this.entities.push({ type: "coin", x: cx(c), y: top(r) + TILE / 2 });
    for (const [c, r] of GEMS) this.entities.push({ type: "gem", x: cx(c), y: top(r) + TILE / 2 });
    for (const [c, r] of HEARTS) this.entities.push({ type: "heart", x: cx(c), y: top(r) + TILE / 2 });
    for (const [t, c, r] of ENEMIES) this.entities.push({ type: t, x: cx(c), y: bottom(r - 1) });
    for (const [c, r] of SPIKES) this.entities.push({ type: "spikes", x: c * TILE, y: top(r) });
    for (const [img, c, r, opts = {}] of DECO) this.entities.push({ type: "deco", img, x: cx(c), y: bottom(r - 1), ...opts });
    for (const [c, r] of CHESTS) this.entities.push({ type: "chest", x: cx(c), y: bottom(r - 1) });
    this.goal = { x: cx(GOAL_COL), y: bottom(GOAL_ROW - 1) };
    this.entities.push({ type: "goal", x: this.goal.x, y: this.goal.y });
  }

  tileAt(col, row) {
    if (col < 0 || col >= this.cols || row < 0 || row >= this.rows) return 0;
    return this.tiles[row][col];
  }
  solidAt(col, row) { return this.tileAt(col, row) > 0; }
  solidAtPx(px, py) { return this.tileAt(Math.floor(px / TILE), Math.floor(py / TILE)) > 0; }
}
