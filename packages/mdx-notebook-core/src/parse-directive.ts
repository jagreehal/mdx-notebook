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
