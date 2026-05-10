import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import type { Plugin } from "unified";
import type { Root, Code } from "mdast";
import { visit } from "unist-util-visit";
import { BuildError } from "./errors.js";
import { parseFenceInfo, parseTimeoutMs } from "./parse-fence.js";
import {
  parseRunDirectiveAttrs,
  parseIpynbDirectiveAttrs,
  inferLang
} from "./parse-directive.js";
import { parseIpynb, extractIpynbCells } from "./ipynb-parser.js";
import type { Cell, Loc } from "./types.js";

export interface CellsCollected {
  cells: Cell[];
}

export interface RemarkMdxNotebookOptions {
  file: string;             // path to the MDX file (used for loc + relative resolution)
  collect: CellsCollected;  // mutable bag to receive discovered cells
  readIpynb?: (absPath: string) => string; // injectable for tests
}

interface ContainerDirective {
  type: "containerDirective";
  name: string;
  attributes?: Record<string, string | null>;
  position?: { start: { line: number; column: number } };
}

export const remarkMdxNotebook: Plugin<[RemarkMdxNotebookOptions], Root> = (opts) => {
  return (tree) => {
    const seen = new Set<string>();
    const file = opts.file;
    const readNb = opts.readIpynb ?? ((p) => readFileSync(p, "utf8"));

    visit(tree, "code", (node: Code) => {
      const info = parseFenceInfo(node.lang ? `${node.lang} ${node.meta ?? ""}`.trim() : (node.meta ?? ""));
      if (!info.runnable) return;
      const loc = makeLoc(file, node.position);
      const id = info.attrs.id;
      if (!id) {
        throw new BuildError({ code: "MISSING_ID", message: "MISSING_ID: code fence missing required `id`", loc });
      }
      assertUnique(seen, id, loc);
      opts.collect.cells.push({
        kind: "inline",
        id,
        lang: info.lang,
        code: node.value + (node.value.endsWith("\n") ? "" : "\n"),
        timeout: parseTimeoutMs(info.attrs.timeout),
        cache: parseCacheAttr(info.attrs.cache),
        env: info.attrs.env,
        loc
      });
    });

    visit(tree, (n) => (n as { type: string }).type === "containerDirective", (node) => {
      const dir = node as unknown as ContainerDirective;
      const loc = makeLoc(file, dir.position ? { start: dir.position.start } : undefined);
      const attrs = stripNulls(dir.attributes);
      if (dir.name === "run") {
        const a = parseRunDirectiveAttrs(attrs, loc);
        assertUnique(seen, a.id, loc);
        const lang = inferLang(a.src);
        opts.collect.cells.push({
          kind: "file",
          id: a.id,
          lang,
          src: a.src,
          timeout: a.timeout,
          cache: a.cache,
          env: a.env,
          loc
        });
      } else if (dir.name === "ipynb") {
        const a = parseIpynbDirectiveAttrs(attrs, loc);
        const absPath = resolve(dirname(file), a.src);
        const buf = readNb(absPath);
        const nb = parseIpynb(buf);
        const cells = extractIpynbCells(nb, a.cells);
        for (const cc of cells) {
          const cellId = `${a.id}:${cc.cellIndex}`;
          assertUnique(seen, cellId, loc);
          opts.collect.cells.push({
            kind: "ipynb",
            id: cellId,
            src: a.src,
            cellIndex: cc.cellIndex,
            loc
          });
        }
      }
    });
  };
};

function makeLoc(file: string, position: { start: { line: number; column: number } } | undefined): Loc {
  return {
    file,
    line: position?.start.line ?? 1,
    column: position?.start.column ?? 1
  };
}

function assertUnique(seen: Set<string>, id: string, loc: Loc): void {
  if (seen.has(id)) {
    throw new BuildError({ code: "DUPLICATE_ID", message: `DUPLICATE_ID: duplicate cell id "${id}"`, loc });
  }
  seen.add(id);
}

function stripNulls(
  attrs: Record<string, string | null> | undefined
): Record<string, string | undefined> {
  const out: Record<string, string | undefined> = {};
  if (!attrs) return out;
  for (const [k, v] of Object.entries(attrs)) {
    out[k] = v ?? undefined;
  }
  return out;
}

function parseCacheAttr(value: string | undefined): boolean | undefined {
  if (value === undefined) return undefined;
  return value !== "false";
}
