import { extname } from "node:path";
import { BuildError } from "./errors.js";
import { parseTimeoutMs, parseDependsOn } from "./parse-fence.js";
import { parseCellsSelector } from "./cells-selector.js";
import type { Loc } from "./types.js";

export interface RunAttrs {
  id: string;
  src: string;
  timeout: number | undefined;
  cache: boolean | undefined;
  env: string | undefined;
  dependsOn: string[] | undefined;
}

export interface IpynbAttrs {
  id: string;
  src: string;
  cells: number[] | null;
}

export interface CheckpointAttrs {
  id: string;
  cell: string;
  path: string | undefined;
  op: "equals" | "includes" | "regex" | "exists" | "gt" | "gte" | "lt" | "lte";
  expected: unknown;
  required: boolean;
  weight: number;
  title: string | undefined;
  hint: string | undefined;
}

export function parseRunDirectiveAttrs(
  raw: Record<string, string | undefined>,
  loc: Loc
): RunAttrs {
  const id = required(raw.id, "MISSING_ID", "MISSING_ID: directive `:::run` missing required `id`", loc);
  const src = required(raw.src, "MISSING_SRC", "MISSING_SRC: directive `:::run` missing required `src`", loc);
  return {
    id,
    src,
    timeout: parseTimeoutMs(raw.timeout),
    cache: parseBool(raw.cache),
    env: raw.env,
    dependsOn: parseDependsOn(raw.dependsOn)
  };
}

export function parseIpynbDirectiveAttrs(
  raw: Record<string, string | undefined>,
  loc: Loc
): IpynbAttrs {
  const id = required(raw.id, "MISSING_ID", "MISSING_ID: directive `:::ipynb` missing required `id`", loc);
  const src = required(raw.src, "MISSING_SRC", "MISSING_SRC: directive `:::ipynb` missing required `src`", loc);
  return { id, src, cells: parseCellsSelector(raw.cells) };
}

export function parseCheckDirectiveAttrs(
  raw: Record<string, string | undefined>,
  loc: Loc
): CheckpointAttrs {
  const id = required(raw.id, "MISSING_ID", "MISSING_ID: directive `:::check` missing required `id`", loc);
  const cell = required(raw.cell, "MISSING_ID", "MISSING_ID: directive `:::check` missing required `cell`", loc);
  const path = raw.path;
  const requiredFlag = parseBool(raw.required);
  const isRequired = requiredFlag ?? true;
  const weight = raw.weight !== undefined ? parsePositiveNumber(raw.weight, "BAD_CHECKPOINT", "BAD_CHECKPOINT: weight must be > 0", loc) : 1;

  const ops: Array<CheckpointAttrs["op"]> = ["equals", "includes", "regex", "exists", "gt", "gte", "lt", "lte"];
  const active = ops.filter((op) => raw[op] !== undefined);
  if (active.length === 0) {
    throw new BuildError({
      code: "BAD_CHECKPOINT",
      message: "BAD_CHECKPOINT: directive `:::check` requires one of equals/includes/regex/exists/gt/gte/lt/lte",
      loc
    });
  }
  if (active.length > 1) {
    throw new BuildError({
      code: "BAD_CHECKPOINT",
      message: `BAD_CHECKPOINT: directive \`:::check\` has multiple operators (${active.join(", ")})`,
      loc
    });
  }
  const op = active[0]!;
  const expected = op === "exists" ? parseExists(raw.exists) : parseLiteral(raw[op]);
  return {
    id,
    cell,
    path,
    op,
    expected,
    required: isRequired,
    weight,
    title: raw.title,
    hint: raw.hint
  };
}

export function inferLang(src: string): string {
  const ext = extname(src).toLowerCase();
  switch (ext) {
    case ".ts":
    case ".tsx":
    case ".mts":
    case ".cts":
      return "ts";
    case ".js":
    case ".jsx":
    case ".mjs":
    case ".cjs":
      return "js";
    default:
      throw new BuildError({
        code: "UNKNOWN_LANG",
        message: `UNKNOWN_LANG: cannot infer language from extension "${ext}" in "${src}"`
      });
  }
}

function required(value: string | undefined, code: string, msg: string, loc: Loc): string {
  if (value === undefined || value === "") {
    throw new BuildError({ code, message: msg, loc });
  }
  return value;
}

function parseBool(value: string | undefined): boolean | undefined {
  if (value === undefined) return undefined;
  if (value === "true") return true;
  if (value === "false") return false;
  return undefined;
}

function parseExists(value: string | undefined): boolean {
  if (value === undefined || value === "") return true;
  const parsed = parseBool(value);
  return parsed ?? true;
}

function parseLiteral(value: string | undefined): unknown {
  if (value === undefined) return undefined;
  const t = value.trim();
  if (t === "true") return true;
  if (t === "false") return false;
  if (t === "null") return null;
  if (t !== "" && !Number.isNaN(Number(t))) return Number(t);
  if ((t.startsWith("{") && t.endsWith("}")) || (t.startsWith("[") && t.endsWith("]"))) {
    try {
      return JSON.parse(t);
    } catch {
      return t;
    }
  }
  if ((t.startsWith("\"") && t.endsWith("\"")) || (t.startsWith("'") && t.endsWith("'"))) {
    return t.slice(1, -1);
  }
  return t;
}

function parsePositiveNumber(value: string, code: string, message: string, loc: Loc): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) {
    throw new BuildError({ code, message, loc });
  }
  return n;
}
