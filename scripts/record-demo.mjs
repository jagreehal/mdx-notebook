// Records a 6-second demo of the JsonEditor live-mutation, then converts to GIF.
// Run from repo root: `node scripts/record-demo.mjs`. Produces docs/demo.gif.

import { chromium } from "@playwright/test";
import { mkdir, rm, readdir, rename } from "node:fs/promises";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const ROOT = resolve(import.meta.dirname, "..");
const OUT_DIR = join(ROOT, "docs");
const VIDEO_DIR = join(ROOT, ".demo-video");
const SITE_URL = "https://mdx-notebook-demo.vercel.app/components";

await mkdir(OUT_DIR, { recursive: true });
await rm(VIDEO_DIR, { recursive: true, force: true });
await mkdir(VIDEO_DIR, { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 960, height: 540 },
  deviceScaleFactor: 2,
  recordVideo: { dir: VIDEO_DIR, size: { width: 960, height: 540 } }
});
const page = await context.newPage();
await page.goto(SITE_URL, { waitUntil: "networkidle" });

const editorSection = page.locator('h3:has-text("<JsonEditor cellId=\'hello\'>")');
await editorSection.scrollIntoViewIfNeeded();
await page.waitForTimeout(600);

const textarea = page.getByLabel("Edit JSON for hello");
await textarea.waitFor({ state: "visible" });

await textarea.click();
await page.waitForTimeout(300);

await textarea.fill('{\n  "greeting": "hello world",\n  "n": 99\n}');
await page.waitForTimeout(800);

await textarea.fill('{\n  "greeting": "mdx-notebook",\n  "n": 2026,\n  "items": [1, 2, 3]\n}');
await page.waitForTimeout(1200);

await textarea.fill('{\n  "greeting": "captured at build time",\n  "n": 42,\n  "editable": true\n}');
await page.waitForTimeout(1200);

await page.close();
await context.close();
await browser.close();

const files = await readdir(VIDEO_DIR);
const webm = files.find((f) => f.endsWith(".webm"));
if (!webm) {
  console.error("No webm produced");
  process.exit(1);
}
const webmPath = join(VIDEO_DIR, webm);
const finalWebm = join(OUT_DIR, "demo.webm");
await rename(webmPath, finalWebm);

console.log(`Recorded ${finalWebm}`);

console.log("Converting to GIF...");
const palette = join(VIDEO_DIR, "palette.png");
const palResult = spawnSync(
  "ffmpeg",
  ["-y", "-i", finalWebm, "-vf", "fps=12,scale=720:-1:flags=lanczos,palettegen", palette],
  { stdio: "inherit" }
);
if (palResult.status !== 0) {
  console.error("ffmpeg palettegen failed");
  process.exit(1);
}
const gifPath = join(OUT_DIR, "demo.gif");
const gifResult = spawnSync(
  "ffmpeg",
  [
    "-y",
    "-i", finalWebm,
    "-i", palette,
    "-lavfi", "fps=12,scale=720:-1:flags=lanczos [x]; [x][1:v] paletteuse",
    gifPath
  ],
  { stdio: "inherit" }
);
if (gifResult.status !== 0) {
  console.error("ffmpeg gif failed");
  process.exit(1);
}

await rm(VIDEO_DIR, { recursive: true, force: true });
console.log(`Done: ${gifPath}`);
