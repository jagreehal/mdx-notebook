import { cp, mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join, resolve, basename } from "node:path";
import { fileURLToPath } from "node:url";

export interface ScaffoldOptions {
  /** Target directory (will be created if missing). */
  target: string;
  /** Override the package.json name. Defaults to basename(target). */
  name?: string;
  /** Use workspace:* deps (only useful inside the monorepo). Default: false. */
  linked?: boolean;
  /** Initialize git. Default: true. */
  git?: boolean;
  /** Print progress. Default: true. */
  log?: boolean;
}

export async function scaffold(options: ScaffoldOptions): Promise<void> {
  const target = resolve(options.target);
  const name = options.name ?? basename(target);
  const linked = options.linked ?? false;
  const log = options.log !== false;

  if (existsSync(target)) {
    const entries = await readdir(target);
    if (entries.length > 0) throw new Error(`target "${target}" exists and is not empty`);
  } else {
    await mkdir(target, { recursive: true });
  }

  const templateDir = locateTemplate();
  await copyTree(templateDir, target);
  await rewritePackageJson(target, name, linked);

  if (log) console.log(`✓ Created ${target}`);
}

function locateTemplate(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  // dist/index.js → ../template (when published)
  return resolve(here, "..", "template");
}

const SKIP = new Set(["node_modules", "dist", ".astro", ".mdx-notebook", ".turbo"]);

async function copyTree(src: string, dest: string): Promise<void> {
  const entries = await readdir(src, { withFileTypes: true });
  await mkdir(dest, { recursive: true });
  for (const e of entries) {
    if (SKIP.has(e.name)) continue;
    const s = join(src, e.name);
    const d = join(dest, e.name);
    if (e.isDirectory()) await copyTree(s, d);
    else await cp(s, d);
  }
}

async function rewritePackageJson(target: string, name: string, linked: boolean): Promise<void> {
  const path = join(target, "package.json");
  const buf = await readFile(path, "utf8");
  const pkg = JSON.parse(buf) as Record<string, unknown>;
  pkg["name"] = name;
  if (!linked) {
    for (const section of ["dependencies", "devDependencies", "peerDependencies"] as const) {
      const sec = pkg[section] as Record<string, string> | undefined;
      if (!sec) continue;
      for (const [k, v] of Object.entries(sec)) {
        if (typeof v === "string" && v.startsWith("workspace:")) sec[k] = "latest";
      }
    }
  }
  await writeFile(path, JSON.stringify(pkg, null, 2) + "\n", "utf8");
}
