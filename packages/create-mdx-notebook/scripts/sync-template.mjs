import { cp, rm, mkdir, readdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = fileURLToPath(import.meta.url);
const ROOT = resolve(here, "../../../..");
const SRC = join(ROOT, "examples/starter");
const DEST = resolve(here, "../../template");

const SKIP = new Set(["node_modules", "dist", ".astro", ".mdx-notebook", ".turbo"]);

async function copy(src, dest) {
  const entries = await readdir(src, { withFileTypes: true });
  await mkdir(dest, { recursive: true });
  for (const e of entries) {
    if (SKIP.has(e.name)) continue;
    const s = join(src, e.name);
    const d = join(dest, e.name);
    if (e.isDirectory()) await copy(s, d);
    else await cp(s, d);
  }
}

await rm(DEST, { recursive: true, force: true });
await copy(SRC, DEST);
console.log(`[sync-template] synced ${SRC} -> ${DEST}`);
