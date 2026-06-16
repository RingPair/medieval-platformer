// Patrolling enemies. They walk back and forth, turning at walls and ledges.
// Stomp from above to defeat; side contact hurts the player.
import { moveAndCollide, groundAhead } from "./physics.js";
import { approach } from "./util.js";

const GRAVITY = 2000;

const KINDS = {
  goblin: { w: 24, h: 34, speed: 46, sheet: "goblin", score: 100 },
  slime: { w: 26, h: 24, speed: 30, sheet: "slime", score: 100 },
};

export class Enemy {
  constructor(type, x, bottomY, game) {
    const k = KINDS[type] || KINDS.goblin;
    this.kind = k; this.type = type; this.game = game;
    this.w = k.w; this.h = k.h;
    this.x = x - k.w / 2; this.y = bottomY - k.h;
    this.vx = -k.speed; this.vy = 0;
    this.dir = -1; this.onGround = false;
    this.animTime = 0; this.dead = false; this.deadT = 0; this.squish = 1;
  }

  stomp() {
    this.dead = true; this.deadT = 0; this.squish = 1;
    this.game.audio.stomp();
    this.game.particles.burst(this.x + this.w / 2, this.y + this.h, "#9ad36a");
    this.game.addScore(this.kind.score, this.x + this.w / 2, this.y);
  }

  update(dt, level) {
    if (this.dead) { this.deadT += dt; this.squish = approach(this.squish, 0, dt * 4); return; }

    this.vx = this.dir * this.kind.speed;
    this.vy = Math.min(this.vy + GRAVITY * dt, 900);
    moveAndCollide(level, this, dt);

    // turn at walls or before walking off a ledge
    if (this.hitWall !== 0 || (this.onGround && !groundAhead(level, this, this.dir))) {
      this.dir *= -1;
    }
    this.animTime += dt;
  }

  get hitbox() { return { x: this.x, y: this.y, w: this.w, h: this.h }; }

  draw(ctx, cam, sheets) {
    const sheet = sheets[this.kind.sheet];
    const a = sheet.anims.walk;
    const fi = a.f[Math.floor(this.animTime * a.fps) % a.f.length];
    const frame = sheet.frames[fi] || sheet.frames[0];
    const img = this.dir > 0 ? frame.flipped : frame.normal;
    const cx = this.x + this.w / 2 - cam.ox;
    const footY = this.y + this.h - cam.oy;
    const scaleY = this.dead ? this.squish : 1;
    const dh = sheet.fh * scaleY;
    const dw = sheet.fw * (this.dead ? 1 + (1 - this.squish) * 0.4 : 1);
    const foot = (sheet.foot || 0) * scaleY; // plant the feet on the ground
    ctx.globalAlpha = this.dead ? Math.max(0, 1 - this.deadT * 1.5) : 1;
    ctx.drawImage(img, Math.round(cx - dw / 2), Math.round(footY - dh + foot), Math.round(dw), Math.round(dh));
    ctx.globalAlpha = 1;
  }
}
