// Procedural retro sound effects via the WebAudio API (no audio assets needed).
// All sounds are tiny synthesized blips so the bundle stays asset-free.
export class Audio {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.master = null;
  }

  _ensure() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.35;
    this.master.connect(this.ctx.destination);
  }

  resume() { this._ensure(); if (this.ctx.state === "suspended") this.ctx.resume(); }
  toggleMute() { this.muted = !this.muted; return this.muted; }

  // Core blip: a frequency ramp with an envelope.
  _blip(type, f0, f1, dur, vol = 0.5) {
    if (this.muted) return;
    this._ensure();
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(f0, t);
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g); g.connect(this.master);
    osc.start(t); osc.stop(t + dur + 0.02);
  }

  jump()  { this._blip("square", 300, 720, 0.16, 0.4); }
  land()  { this._blip("sine", 200, 90, 0.10, 0.35); }
  coin()  { this._blip("square", 880, 1320, 0.08, 0.35); setTimeout(() => this._blip("square", 1320, 1760, 0.09, 0.3), 60); }
  gem()   { this._blip("triangle", 660, 1980, 0.22, 0.4); }
  hurt()  { this._blip("sawtooth", 380, 70, 0.28, 0.45); }
  stomp() { this._blip("square", 520, 120, 0.12, 0.4); }
  win()   { [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => this._blip("square", f, f, 0.16, 0.4), i * 130)); }
  lose()  { [392, 330, 262, 196].forEach((f, i) => setTimeout(() => this._blip("sawtooth", f, f * 0.9, 0.22, 0.4), i * 150)); }
}
