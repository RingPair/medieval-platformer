// The hero knight: movement with platformer game-feel + animation + squash/stretch.
import { TILE } from "./assets.js";
import { moveAndCollide } from "./physics.js";
import { clamp, approach } from "./util.js";

const GRAVITY = 1900;
const MAX_FALL = 900;
const RUN_SPEED = 176;
const ACCEL_GROUND = 1600;
const ACCEL_AIR = 1000;
const FRICTION = 1800;
const JUMP_VEL = 605;
const COYOTE = 0.10;       // grace period to jump after leaving a ledge
const JUMP_BUFFER = 0.12;  // remember a jump press slightly before landing
const JUMP_CUT = 0.45;     // release-to-shorten variable jump
const MAX_JUMPS = 2;       // ground jump + one mid-air (double) jump
const AIR_JUMP_VEL = 560;  // upward velocity of the mid-air jump

export class Player {
  constructor(spawn, game) {
    this.game = game;
    this.w = 20; this.h = 40;
    this.reset(spawn);
  }

  reset(spawn) {
    this.x = spawn.x + (TILE - this.w) / 2;
    this.y = spawn.y;
    this.vx = 0; this.vy = 0;
    this.onGround = false;
    this.facing = 1;
    this.coyote = 0; this.buffer = 0; this.jumping = false; this.jumpsLeft = MAX_JUMPS;
    this.anim = "idle"; this.animTime = 0; this.frame = 0;
    this.sx = 1; this.sy = 1;      // squash/stretch scale
    this.hp = 3; this.maxHp = 3;
    this.invuln = 0; this.dead = false; this.fell = false;
    this.bob = 0;
  }

  // Respawn at a checkpoint after a pit fall (keeps hp/coins).
  respawn(cp) {
    this.x = cp.x; this.y = cp.y;
    this.vx = 0; this.vy = 0;
    this.fell = false; this.dead = false; this.invuln = 1.2;
    this.sx = 1; this.sy = 1;
  }

  hurt(fromX) {
    if (this.invuln > 0 || this.dead) return;
    this.hp--;
    this.invuln = 1.1;
    this.vy = -340;
    this.vx = (this.x + this.w / 2 < fromX ? -1 : 1) * 230;
    this.game.audio.hurt();
    this.game.cam.addShake(8);
    this.game.particles.burst(this.x + this.w / 2, this.y + this.h / 2, "#ff5d5d");
    if (this.hp <= 0) this.dead = true;
  }

  update(dt, input, level) {
    if (this.dead) { // brief death tumble
      this.vy = Math.min(this.vy + GRAVITY * dt, MAX_FALL);
      this.y += this.vy * dt; this.x += this.vx * dt; this.vx *= 0.98;
      return;
    }

    const left = input.isDown("left"), right = input.isDown("right");
    const move = (right ? 1 : 0) - (left ? 1 : 0);
    const accel = this.onGround ? ACCEL_GROUND : ACCEL_AIR;
    if (move !== 0) {
      this.vx = approach(this.vx, move * RUN_SPEED, accel * dt);
      this.facing = move;
    } else {
      this.vx = approach(this.vx, 0, FRICTION * dt);
    }

    // timers
    this.coyote = this.onGround ? COYOTE : Math.max(0, this.coyote - dt);
    this.buffer = input.wasPressed("jump") ? JUMP_BUFFER : Math.max(0, this.buffer - dt);
    this.invuln = Math.max(0, this.invuln - dt);
    if (this.onGround) this.jumpsLeft = MAX_JUMPS;
    // walking off a ledge past the coyote window consumes the grounded jump
    else if (this.coyote <= 0 && this.jumpsLeft === MAX_JUMPS) this.jumpsLeft = MAX_JUMPS - 1;

    // jump: grounded/coyote jump, or a mid-air double jump
    if (this.buffer > 0 && (this.coyote > 0 || this.jumpsLeft > 0)) {
      const ground = this.coyote > 0;
      this.vy = ground ? -JUMP_VEL : -AIR_JUMP_VEL;
      this.jumpsLeft = ground ? MAX_JUMPS - 1 : this.jumpsLeft - 1;
      this.jumping = true; this.buffer = 0; this.coyote = 0;
      this.sx = 0.72; this.sy = 1.32; // stretch up
      this.game.audio.jump();
      if (ground) this.game.particles.dust(this.x + this.w / 2, this.y + this.h, this.facing);
      else this.game.particles.sparkle(this.x + this.w / 2, this.y + this.h, "#cfe8ff"); // air-jump puff
    }
    if (this.jumping && !input.isDown("jump") && this.vy < 0) { this.vy *= JUMP_CUT; this.jumping = false; }
    if (this.vy >= 0) this.jumping = false;

    // gravity
    this.vy = Math.min(this.vy + GRAVITY * dt, MAX_FALL);

    const wasAir = !this.onGround;
    moveAndCollide(level, this, dt);

    // landing squash + dust
    if (this.onGround && wasAir && this._fallVy > 240) {
      this.sx = 1.3; this.sy = 0.7;
      this.game.particles.dust(this.x + this.w / 2, this.y + this.h, this.facing);
      this.game.audio.land();
    }
    this._fallVy = this.vy;

    // ease squash/stretch back to 1
    this.sx = approach(this.sx, 1, dt * 4.5);
    this.sy = approach(this.sy, 1, dt * 4.5);

    // fell into a pit — the game decides respawn vs game-over
    if (this.y > level.h + 40) this.fell = true;

    this._animate(dt, move);
  }

  _animate(dt, move) {
    let next;
    if (!this.onGround) next = this.vy < -40 ? "jump" : "fall";
    else if (Math.abs(this.vx) > 12) next = "run";
    else next = "idle";
    if (next !== this.anim) { this.anim = next; this.animTime = 0; this.frame = 0; }
    this.animTime += dt;
    this.bob = this.anim === "idle" ? Math.sin(performance.now() / 380) * 1.2 : 0;
  }

  draw(ctx, cam, sheets) {
    const sheet = sheets.hero;
    const a = sheet.anims[this.anim];
    const fi = a.f[Math.floor(this.animTime * a.fps) % a.f.length];
    const frame = sheet.frames[fi] || sheet.frames[0];
    // Source walk frames face LEFT, so flip when the hero faces right.
    const img = this.facing < 0 ? frame.normal : frame.flipped;

    // flash when invulnerable
    if (this.invuln > 0 && Math.floor(this.invuln * 20) % 2 === 0) return;

    const cx = this.x + this.w / 2 - cam.ox;
    const footY = this.y + this.h - cam.oy;
    const dw = sheet.fw * this.sx;
    const dh = sheet.fh * this.sy;
    ctx.drawImage(img, Math.round(cx - dw / 2), Math.round(footY - dh + this.bob), Math.round(dw), Math.round(dh));
  }
}
