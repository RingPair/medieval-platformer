// Bootstrap: load assets, manage menus, run the fixed-timestep-ish game loop.
import { loadAssets, VIEW_W, VIEW_H } from "./assets.js";
import { Input } from "./input.js";
import { Audio } from "./audio.js";
import { Game } from "./game.js";

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
ctx.imageSmoothingEnabled = false;

const $ = (id) => document.getElementById(id);
const show = (id) => $(id).classList.remove("hidden");
const hide = (id) => $(id).classList.add("hidden");

const input = new Input();
const audio = new Audio();
let game = null;
let mode = "loading"; // loading | title | play

// Reveal touch controls on touch-capable devices.
if (matchMedia("(pointer: coarse)").matches) $("touch").classList.add("show");

function toMenu(which) {
  mode = "title";
  show("overlay");
  for (const p of ["loading", "title-screen", "win-screen", "lose-screen"]) hide(p);
  show(which);
}

function startGame() {
  if (!assets) return; // not loaded yet
  audio.resume();
  hide("overlay");
  for (const p of ["loading", "title-screen", "win-screen", "lose-screen"]) hide(p);
  if (!game) game = new Game(ctx, assets, audio);
  else game.reset();
  mode = "play";
  if (location.hash === "#debug") { window.__G = game; window.__I = input; }
}

// Buttons
$("play-btn").onclick = startGame;
$("again-btn").onclick = startGame;
$("retry-btn").onclick = startGame;
$("mute-btn").onclick = () => { const m = audio.toggleMute(); $("mute-btn").classList.toggle("off", m); $("mute-btn").textContent = m ? "♪̶" : "♪"; };
addEventListener("keydown", (e) => {
  if ((mode === "title") && (e.code === "Enter" || e.code === "Space")) startGame();
});

let assets = null;
let last = performance.now();
let endShown = false;

function frame(t) {
  const dt = Math.min((t - last) / 1000, 1 / 30);
  last = t;
  input.beginFrame();

  if (mode === "play" && game) {
    if (input.wasPressed("restart")) game.reset();
    game.update(dt, input);
    game.draw();

    if (game.state === "win" && game.endTimer > 0.8 && !endShown) {
      endShown = true; $("win-stats").innerHTML = `You gathered <b>${game.coins}</b> treasures · score <b>${game.score}</b>`;
      mode = "title"; show("overlay"); show("win-screen");
    } else if (game.state === "lose" && game.endTimer > 0.9 && !endShown) {
      endShown = true; mode = "title"; show("overlay"); show("lose-screen");
    }
    if (game.state === "playing") endShown = false;
  }

  requestAnimationFrame(frame);
}

// ---- load ----
(async () => {
  try {
    assets = await loadAssets((p, label) => {
      $("bar-fill").style.width = `${Math.round(p * 100)}%`;
      $("load-label").textContent = label;
    });
    // Paint the world once so menus sit over the actual (blurred) game scene.
    game = new Game(ctx, assets, audio);
    game.draw();
    toMenu("title-screen");
    requestAnimationFrame((t) => { last = t; requestAnimationFrame(frame); });
  } catch (e) {
    $("load-label").textContent = "Failed to load: " + e.message;
    console.error(e);
  }
})();
