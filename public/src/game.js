// The game world: owns the level, player, enemies, pickups, parallax background,
// HUD, and the win/lose logic. main.js drives state transitions.
import { TILE, VIEW_W, VIEW_H } from "./assets.js";
import { Level } from "./level.js";
import { Player } from "./player.js";
import { Enemy } from "./enemy.js";
import { Pickup, Spikes, Goal, Deco, Chest } from "./things.js";
import { Camera } from "./camera.js";
import { Particles } from "./particles.js";
import { aabb, rng } from "./util.js";

const SKY_TOP = "#7ec8e6", SKY_MID = "#bfe6f2", SKY_LOW = "#e9f6c8";

export class Game {
  constructor(ctx, assets, audio) {
    this.ctx = ctx; this.assets = assets; this.audio = audio;
    this.cam = new Camera(VIEW_W, VIEW_H);
    this.particles = new Particles(rng(12345));
    this.rand = rng(98765);
    this.clouds = Array.from({ length: 6 }, (_, i) => ({
      x: this.rand() * 1400, y: 12 + this.rand() * 90, s: 0.5 + this.rand() * 0.9, sp: 4 + this.rand() * 8,
    }));
    this.reset();
  }

  reset() {
    this.level = new Level();
    this.cam.setBounds(this.level.w, this.level.h);
    this.player = new Player(this.level.spawn, this);
    this.enemies = []; this.pickups = []; this.spikes = []; this.deco = []; this.chests = []; this.goal = null;
    for (const e of this.level.entities) {
      if (e.type === "goblin" || e.type === "slime") this.enemies.push(new Enemy(e.type, e.x, e.y, this));
      else if (e.type === "coin" || e.type === "gem" || e.type === "heart") this.pickups.push(new Pickup(e.type, e.x, e.y));
      else if (e.type === "spikes") this.spikes.push(new Spikes(e.x, e.y));
      else if (e.type === "goal") this.goal = new Goal(e.x, e.y);
      else if (e.type === "deco") this.deco.push(new Deco(e.img, e.x, e.y, e));
      else if (e.type === "chest") this.chests.push(new Chest(e.x, e.y));
    }
    this.coins = 0; this.score = 0; this.state = "playing"; this.endTimer = 0;
    this.checkpoint = { x: this.player.x, y: this.player.y };
    this.cam.follow(this.player, 1); // snap
    this._buildHud();
  }

  addScore(n, x, y) {
    this.score += n;
    this.particles.sparkle(x, y, "#ffe66d");
  }

  // ---- update ----
  update(dt, input) {
    if (this.state === "playing") {
      this.player.update(dt, input, this.level);
      for (const e of this.enemies) e.update(dt, this.level);
      this._collisions();
      // remember the last safe standing spot for pit respawns
      const p = this.player;
      if (p.onGround && !p.dead && p.invuln <= 0) this.checkpoint = { x: p.x, y: p.y };
      if (p.fell) {
        p.hp--; this.cam.addShake(7); this.audio.hurt();
        if (p.hp > 0) { this.particles.burst(p.x + p.w / 2, this.level.h - 20, "#6ca8ff"); p.respawn(this.checkpoint); this.cam.follow(p, 1); }
        else p.dead = true;
      }
      if (p.dead) { this.state = "lose"; this.endTimer = 0; this.audio.lose(); }
    } else {
      // let player/particles settle on the end screens
      this.player.update(dt, { isDown: () => false, wasPressed: () => false }, this.level);
      this.endTimer += dt;
    }
    this.enemies = this.enemies.filter((e) => !(e.dead && e.deadT > 0.6));
    this.cam.follow(this.player, dt);
    this.particles.update(dt);
    for (const c of this.clouds) { c.x -= c.sp * dt; if (c.x < -200) c.x = this.level.w * 0.6 + this.rand() * 400; }
    this._updateHud();
  }

  _collisions() {
    const p = this.player;
    const pb = { x: p.x, y: p.y, w: p.w, h: p.h };
    // enemies: stomp vs hurt
    for (const e of this.enemies) {
      if (e.dead) continue;
      if (!aabb(pb, e.hitbox)) continue;
      const falling = p.vy > 0 && (p.y + p.h) - e.y < 20;
      if (falling) { e.stomp(); p.vy = -380; p.jumping = true; p.jumpsLeft = Math.max(p.jumpsLeft, 1); p.sx = 1.25; p.sy = 0.78; }
      else p.hurt(e.x + e.w / 2);
    }
    // spikes
    for (const s of this.spikes) if (aabb(pb, s.box)) p.hurt(p.x + p.w / 2);
    // pickups
    for (const pk of this.pickups) {
      if (pk.taken || !aabb(pb, pk.box)) continue;
      pk.taken = true;
      if (pk.type === "heart") { p.hp = Math.min(p.maxHp, p.hp + 1); this.audio.gem(); }
      else if (pk.type === "gem") { this.coins += pk.value; this.score += 500; this.audio.gem(); }
      else { this.coins += 1; this.score += 100; this.audio.coin(); }
      this.particles.sparkle(pk.x, pk.y, pk.type === "gem" ? "#7ec8ff" : "#ffe66d");
    }
    // goal
    if (this.goal && !this.goal.reached && aabb(pb, this.goal.box)) {
      this.goal.reached = true; this.state = "win"; this.endTimer = 0; this.audio.win();
      this.particles.sparkle(this.goal.x, this.goal.y - 90, "#ffe66d");
    }
  }

  // ---- draw ----
  draw() {
    const ctx = this.ctx;
    this._drawSky(ctx);
    this._drawParallax(ctx);
    for (const d of this.deco) if (d.back) d.draw(ctx, this.cam, this.assets.images);
    this._drawTiles(ctx);
    for (const d of this.deco) if (!d.back) d.draw(ctx, this.cam, this.assets.images);
    for (const c of this.chests) c.draw(ctx, this.cam, this.assets.images);
    for (const s of this.spikes) s.draw(ctx, this.cam, this.assets.images);
    if (this.goal) this.goal.draw(ctx, this.cam, this.assets.images);
    for (const pk of this.pickups) pk.draw(ctx, this.cam, this.assets.images);
    for (const e of this.enemies) e.draw(ctx, this.cam, this.assets.sheets);
    this.player.draw(ctx, this.cam, this.assets.sheets);
    this.particles.draw(ctx, { x: this.cam.ox, y: this.cam.oy });
  }

  _drawSky(ctx) {
    const g = ctx.createLinearGradient(0, 0, 0, VIEW_H);
    g.addColorStop(0, SKY_TOP); g.addColorStop(0.6, SKY_MID); g.addColorStop(1, SKY_LOW);
    ctx.fillStyle = g; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    // clouds (soft white blobs)
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    for (const c of this.clouds) {
      const x = c.x - this.cam.ox * 0.15, y = c.y - this.cam.oy * 0.1;
      this._cloud(ctx, x, y, c.s);
    }
  }
  _cloud(ctx, x, y, s) {
    ctx.beginPath();
    ctx.ellipse(x, y, 22 * s, 12 * s, 0, 0, 7);
    ctx.ellipse(x + 18 * s, y + 4 * s, 16 * s, 10 * s, 0, 0, 7);
    ctx.ellipse(x - 18 * s, y + 4 * s, 16 * s, 9 * s, 0, 0, 7);
    ctx.fill();
  }

  _drawParallax(ctx) {
    // Anchor layers to the ground/horizon line and scale them up so they rise
    // from the ground and fill the backdrop (their faded tops sit off-screen
    // during normal play, instead of floating in a big empty sky).
    const horizon = 11 * TILE;                 // main ground surface (world y)
    const groundScreenY = horizon - this.cam.oy;
    const layer = (img, p, scale, sink) => {
      const w = img.width * scale, h = img.height * scale;
      let ox = (this.cam.ox * p) % w; if (ox < 0) ox += w;
      const y = groundScreenY + sink - h;      // bottom tucked just behind the ground
      for (let x = -ox; x < VIEW_W + w; x += w)
        ctx.drawImage(img, Math.round(x), Math.round(y), Math.ceil(w), Math.ceil(h));
    };
    layer(this.assets.images.hillsFar, 0.30, 1.28, 8);
    layer(this.assets.images.hillsNear, 0.50, 1.06, 16);
  }

  _drawTiles(ctx) {
    const { images } = this.assets, L = this.level, cam = this.cam;
    const c0 = Math.max(0, Math.floor(cam.ox / TILE));
    const c1 = Math.min(L.cols - 1, Math.ceil((cam.ox + VIEW_W) / TILE));
    const r0 = Math.max(0, Math.floor(cam.oy / TILE));
    const r1 = Math.min(L.rows - 1, Math.ceil((cam.oy + VIEW_H) / TILE));
    for (let r = r0; r <= r1; r++) {
      for (let c = c0; c <= c1; c++) {
        const t = L.tiles[r][c];
        if (!t) continue;
        const img = t === 2 ? images.stone : L.cap[r][c] ? images.grass : images.dirt;
        const sx = Math.round(c * TILE - cam.ox), sy = Math.round(r * TILE - cam.oy);
        ctx.drawImage(img, sx, sy, TILE, TILE);
        // shade deeper soil so the underground recedes into shadow
        const d = L.depth[r][c];
        if (d > 0) {
          ctx.fillStyle = `rgba(18,10,6,${Math.min(0.62, d * 0.16)})`;
          ctx.fillRect(sx, sy, TILE, TILE);
        }
      }
    }
  }

  // ---- HUD ----
  _buildHud() {
    const hearts = document.getElementById("hud-hearts");
    hearts.innerHTML = "";
    this._heartEls = [];
    for (let i = 0; i < this.player.maxHp; i++) {
      const img = document.createElement("img");
      img.src = "assets/props/heart.png";
      hearts.appendChild(img);
      this._heartEls.push(img);
    }
    document.getElementById("coin-icon").src = "assets/props/coin.png";
    document.getElementById("hud").classList.remove("hidden");
  }
  _updateHud() {
    for (let i = 0; i < this._heartEls.length; i++) this._heartEls[i].classList.toggle("lost", i >= this.player.hp);
    document.getElementById("coin-count").textContent = this.coins;
  }
}
