// Keyboard + on-screen touch controls. Exposes a simple held/pressed state.
export class Input {
  constructor() {
    this.held = new Set();
    this.pressed = new Set(); // edge-triggered this frame
    this._downThisFrame = new Set();

    const map = (e) => {
      switch (e.code) {
        case "ArrowLeft": case "KeyA": return "left";
        case "ArrowRight": case "KeyD": return "right";
        case "ArrowUp": case "KeyW": case "Space": return "jump";
        case "KeyR": return "restart";
        case "Enter": return "start";
        default: return null;
      }
    };

    addEventListener("keydown", (e) => {
      const a = map(e);
      if (!a) return;
      if (["jump", "start"].includes(a) || e.code === "Space") e.preventDefault();
      if (!this.held.has(a)) this._downThisFrame.add(a);
      this.held.add(a);
    });
    addEventListener("keyup", (e) => {
      const a = map(e);
      if (a) this.held.delete(a);
    });
    addEventListener("blur", () => this.held.clear());

    this._bindTouch();
  }

  _bindTouch() {
    const bind = (id, action) => {
      const el = document.getElementById(id);
      if (!el) return;
      const on = (e) => { e.preventDefault(); if (!this.held.has(action)) this._downThisFrame.add(action); this.held.add(action); };
      const off = (e) => { e.preventDefault(); this.held.delete(action); };
      el.addEventListener("touchstart", on, { passive: false });
      el.addEventListener("touchend", off, { passive: false });
      el.addEventListener("touchcancel", off, { passive: false });
      el.addEventListener("mousedown", on);
      addEventListener("mouseup", off);
    };
    bind("btn-left", "left");
    bind("btn-right", "right");
    bind("btn-jump", "jump");
  }

  // Call once per frame AFTER reading, to roll edge-triggered presses.
  beginFrame() {
    this.pressed = new Set(this._downThisFrame);
    this._downThisFrame.clear();
  }

  isDown(a) { return this.held.has(a); }
  wasPressed(a) { return this.pressed.has(a); }
}
