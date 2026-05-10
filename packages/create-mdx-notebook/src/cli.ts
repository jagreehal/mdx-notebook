#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { scaffold } from "./index.js";

interface Args {
  target: string | undefined;
  linked: boolean;
  noGit: boolean;
  help: boolean;
}

function parseArgs(argv: string[]): Args {
  const out: Args = { target: undefined, linked: false, noGit: false, help: false };
  for (const a of argv) {
    if (a === "--linked") out.linked = true;
    else if (a === "--no-git") out.noGit = true;
    else if (a === "--help" || a === "-h") out.help = true;
    else if (!out.target) out.target = a;
  }
  return out;
}

const HELP = `\
Usage: create-mdx-notebook <directory> [options]

Options:
  --linked     Keep workspace:* deps (only useful inside the mdx-notebook monorepo)
  --no-git     Skip 'git init'
  -h, --help   Show this help
`;

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) { process.stdout.write(HELP); return; }
  if (!args.target) {
    process.stderr.write("error: missing target directory\n\n" + HELP);
    process.exitCode = 2;
    return;
  }

  const target = resolve(args.target);

  await scaffold({ target, linked: args.linked, log: true });

  if (!args.noGit && !existsSync(`${target}/.git`)) {
    spawnSync("git", ["init", "-q"], { cwd: target, stdio: "ignore" });
    process.stdout.write("✓ Initialized git\n");
  }

  process.stdout.write(`\nNext steps:\n  cd ${args.target}\n  pnpm install   # or: npm install\n  pnpm dev\n\n`);
}

main().catch((err: Error) => {
  process.stderr.write(`error: ${err.message}\n`);
  process.exit(1);
});
