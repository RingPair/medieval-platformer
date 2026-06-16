// Lightweight particle system for juice: dust, sparkles, hit bursts.
import { randRange } from "./util.js";

export class Particles {
  constructor(rand) {
    this.rand = rand;
    this.list = [];
  }

  spawn(x, y, opts = {}) {
    const {
      count = 8, color = "#ffffff", speed = 60, spread = Math.PI * 2,
      angle = -Math.PI / 2, life = 0.5, size = 3, gravity = 300, drag = 0.9,
    } = opts;
    for (let i = 0; i < count; i++) {
      const a = angle + randRange(this.rand, -spread / 2, spread / 2);
      const s = randRange(this.rand, speed * 0.4, speed);
      this.list.push({
        x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
        life, maxLife: life, color, size: randRange(this.rand, size * 0.6, size), gravity, drag,
      });
    }
  }

  dust(x, y, dir = 0) {
    this.spawn(x, y, { count: 6, color: "#d9c8a3", speed: 50, angle: Math.PI, spread: Math.PI, life: 0.35, size: 3, gravity: 120 });
  }
  sparkle(x, y, color = "#ffe66d") {
    this.spawn(x, y, { count: 12, color, speed: 110, spread: Math.PI * 2, life: 0.5, size: 3, gravity: 60, drag: 0.88 });
  }
  burst(x, y, color = "#ff5d5d") {
    this.spawn(x, y, { count: 14, color, speed: 150, spread: Math.PI * 2, life: 0.45, size: 4, gravity: 200 });
  }

  update(dt) {
    for (const p of this.list) {
      p.vx *= p.drag; p.vy = p.vy * p.drag + p.gravity * dt;
      p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt;
    }
    this.list = this.list.filter((p) => p.life > 0);
  }

  draw(ctx, cam) {
    for (const p of this.list) {
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
      ctx.fillStyle = p.color;
      const s = p.size;
      ctx.fillRect(Math.round(p.x - cam.x - s / 2), Math.round(p.y - cam.y - s / 2), s, s);
    }
    ctx.globalAlpha = 1;
  }
}
