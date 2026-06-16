// Collectibles (coin/gem/heart), hazards (spikes), the goal banner, decorations,
// and chests. Simple entities with bob/spin animation + overlap logic.
import { TILE } from "./assets.js";

const now = () => performance.now() / 1000;

export class Pickup {
  constructor(type, x, y) {
    this.type = type; this.x = x; this.y = y; this.taken = false;
    this.phase = (x * 0.7 + y * 0.3) % (Math.PI * 2); // desync bobbing
    this.r = type === "gem" ? 13 : 12;
    this.value = type === "gem" ? 5 : 1;
  }
  get box() { return { x: this.x - this.r, y: this.y - this.r, w: this.r * 2, h: this.r * 2 }; }

  draw(ctx, cam, images) {
    if (this.taken) return;
    const t = now();
    const bob = Math.sin(t * 2.5 + this.phase) * 3;
    const x = this.x - cam.ox, y = this.y - cam.oy + bob;
    const img = images[this.type];
    if (this.type === "coin") {
      // fake 3D spin by squashing width with a cosine
      const s = Math.cos(t * 5 + this.phase);
      const w = Math.max(3, Math.abs(s) * img.width);
      ctx.globalAlpha = 1;
      if (s < 0) ctx.filter = "brightness(0.8)";
      ctx.drawImage(img, Math.round(x - w / 2), Math.round(y - img.height / 2), Math.round(w), img.height);
      ctx.filter = "none";
    } else {
      ctx.drawImage(img, Math.round(x - img.width / 2), Math.round(y - img.height / 2));
    }
  }
}

export class Spikes {
  constructor(x, y) { this.x = x; this.y = y; }
  // hazard zone: top ~16px of the cell, inset a bit so grazing the side is safe
  get box() { return { x: this.x + 3, y: this.y + TILE - 16, w: TILE - 6, h: 16 }; }
  draw(ctx, cam, images) {
    const img = images.spikes;
    const w = TILE, h = (img.height / img.width) * w;
    ctx.drawImage(img, Math.round(this.x - cam.ox), Math.round(this.y + TILE - h - cam.oy), w, h);
  }
}

export class Goal {
  constructor(x, bottomY) { this.x = x; this.y = bottomY; this.reached = false; }
  get box() { return { x: this.x - 14, y: this.y - 110, w: 28, h: 110 }; }
  draw(ctx, cam, images) {
    const img = images.banner;
    const sway = Math.sin(now() * 1.5) * 1.5;
    ctx.drawImage(img, Math.round(this.x - img.width / 2 + sway - cam.ox), Math.round(this.y - img.height - cam.oy));
  }
}

export class Deco {
  constructor(img, x, bottomY, opts = {}) {
    this.img = img; this.x = x; this.y = bottomY;
    this.back = !!opts.back; this.scale = opts.scale || 1;
  }
  draw(ctx, cam, images) {
    const im = images[this.img];
    const w = im.width * this.scale, h = im.height * this.scale;
    ctx.drawImage(im, Math.round(this.x - w / 2 - cam.ox), Math.round(this.y - h - cam.oy), Math.round(w), Math.round(h));
  }
}

export class Chest {
  constructor(x, bottomY) { this.x = x; this.y = bottomY; this.open = false; }
  draw(ctx, cam, images) {
    const im = images.chest;
    ctx.drawImage(im, Math.round(this.x - im.width / 2 - cam.ox), Math.round(this.y - im.height - cam.oy));
  }
}
