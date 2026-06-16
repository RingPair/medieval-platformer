// Reusable Replicate API harness.
// Run with: node --env-file=.env tools/replicate.mjs <owner/model> '<json-input>' <outDir> <basename>
// Or import { generate } from './replicate.mjs' in other scripts.
import { mkdir, writeFile } from "node:fs/promises";
import { join, dirname } from "node:path";

const API = "https://api.replicate.com/v1";
const TOKEN = process.env.REPLICATE_API_TOKEN;
if (!TOKEN) {
  console.error("Missing REPLICATE_API_TOKEN. Run with: node --env-file=.env ...");
  process.exit(1);
}

const headers = {
  Authorization: `Bearer ${TOKEN}`,
  "Content-Type": "application/json",
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Create a prediction against an official model (latest version) and wait for it.
export async function predict(model, input, { timeoutMs = 300000, pollMs = 2000, maxRetries = 6 } = {}) {
  let res, txt;
  for (let attempt = 0; ; attempt++) {
    res = await fetch(`${API}/models/${model}/predictions`, {
      method: "POST",
      headers: { ...headers, Prefer: "wait=60" },
      body: JSON.stringify({ input }),
    });
    if (res.ok) break;
    txt = await res.text();
    // Retry on rate-limit / transient server errors, honoring retry_after.
    const transient = res.status === 429 || res.status >= 500;
    if (!transient || attempt >= maxRetries) {
      throw new Error(`POST predictions failed ${res.status}: ${txt}`);
    }
    let wait = 2000 * (attempt + 1);
    try { const j = JSON.parse(txt); if (j.retry_after) wait = (j.retry_after + 1) * 1000; } catch {}
    await sleep(wait);
  }
  let pred = await res.json();
  const started = Date.now();
  while (["starting", "processing"].includes(pred.status)) {
    if (Date.now() - started > timeoutMs) throw new Error(`Timeout waiting for ${pred.id}`);
    await sleep(pollMs);
    const r = await fetch(pred.urls.get, { headers });
    pred = await r.json();
  }
  if (pred.status !== "succeeded") {
    throw new Error(`Prediction ${pred.id} ${pred.status}: ${JSON.stringify(pred.error)}\nLOGS:\n${(pred.logs || "").slice(-1500)}`);
  }
  return pred;
}

// Normalize output to a flat array of URL strings.
function outputUrls(output) {
  if (!output) return [];
  if (typeof output === "string") return [output];
  if (Array.isArray(output)) return output.flatMap(outputUrls);
  if (typeof output === "object" && output.url) return [output.url];
  return [];
}

export async function download(url, destPath) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`Download failed ${r.status} for ${url}`);
  const buf = Buffer.from(await r.arrayBuffer());
  await mkdir(dirname(destPath), { recursive: true });
  await writeFile(destPath, buf);
  return { path: destPath, bytes: buf.length };
}

// High-level: generate + download all outputs to outDir as <basename>[-i].<ext>
export async function generate(model, input, outDir, basename) {
  const pred = await predict(model, input);
  const urls = outputUrls(pred.output);
  const files = [];
  for (let i = 0; i < urls.length; i++) {
    const u = urls[i];
    const ext = (u.split("?")[0].match(/\.(png|jpg|jpeg|webp|gif)$/i)?.[1] || "png").toLowerCase();
    const name = urls.length > 1 ? `${basename}-${i}.${ext}` : `${basename}.${ext}`;
    const dest = join(outDir, name);
    files.push(await download(u, dest));
  }
  return {
    id: pred.id,
    status: pred.status,
    predictTime: pred.metrics?.predict_time,
    files: files.map((f) => f.path),
    bytes: files.map((f) => f.bytes),
  };
}

// CLI entrypoint
if (import.meta.url === `file://${process.argv[1].replace(/\\/g, "/")}` || process.argv[1].endsWith("replicate.mjs")) {
  const [, , model, inputJson, outDir = "assets/raw", basename = "out"] = process.argv;
  if (!model || !inputJson) {
    console.error('Usage: node --env-file=.env tools/replicate.mjs <owner/model> \'<json-input>\' [outDir] [basename]');
    process.exit(1);
  }
  const input = JSON.parse(inputJson);
  try {
    const result = await generate(model, input, outDir, basename);
    console.log(JSON.stringify(result, null, 2));
  } catch (e) {
    console.error("ERROR:", e.message);
    process.exit(1);
  }
}
