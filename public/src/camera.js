// Smooth follow-camera with world bounds and a small look-ahead + screen shake.
import { clamp, lerp } from "./util.js";

export class Camera {
  constructor(viewW, viewH) {
    this.x = 0; this.y = 0;
    this.viewW = viewW; this.viewH = viewH;
    this.worldW = Infinity; this.worldH = Infinity;
    this.shake = 0;
    this._sx = 0; this._sy = 0;
  }

  setBounds(w, h) { this.worldW = w; this.worldH = h; }
  addShake(amount) { this.shake = Math.min(this.shake + amount, 14); }

  follow(target, dt) {
    // Aim slightly ahead in the direction of travel, biased upward so the
    // player sees what they're jumping toward.
    const aheadX = clamp((target.vx || 0) * 0.18, -70, 70);
    const tx = target.x + target.w / 2 + aheadX - this.viewW / 2;
    const ty = target.y + target.h / 2 - this.viewH * 0.58;
    this.x = lerp(this.x, tx, Math.min(1, dt * 6));
    this.y = lerp(this.y, ty, Math.min(1, dt * 5));
    this.x = clamp(this.x, 0, Math.max(0, this.worldW - this.viewW));
    this.y = clamp(this.y, 0, Math.max(0, this.worldH - this.viewH));

    // Decay shake; expose an offset applied at draw time.
    this.shake *= Math.pow(0.0001, dt);
    if (this.shake < 0.2) this.shake = 0;
    const ang = Math.random() * Math.PI * 2;
    this._sx = Math.cos(ang) * this.shake;
    this._sy = Math.sin(ang) * this.shake;
  }

  // Effective top-left used for rendering (includes shake).
  get ox() { return this.x + this._sx; }
  get oy() { return this.y + this._sy; }
}
