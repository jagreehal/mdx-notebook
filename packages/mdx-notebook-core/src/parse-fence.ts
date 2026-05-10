import { BuildError } from "./errors.js";

export type FenceInfo =
  | { runnable: false; lang: string }
  | { runnable: true; lang: string; attrs: Record<string, string> };

export function parseFenceInfo(info: string): FenceInfo {
  const tokens = tokenize(info);
  const lang = tokens[0] ?? "";
  if (tokens[1] !== "run") return { runnable: false, lang };
  const attrs: Record<string, string> = {};
  for (const tok of tokens.slice(2)) {
    const eq = tok.indexOf("=");
    if (eq <= 0) continue;
    const key = tok.slice(0, eq);
    const raw = tok.slice(eq + 1);
    attrs[key] = unquote(raw);
  }
  return { runnable: true, lang, attrs };
}

function tokenize(input: string): string[] {
  const out: string[] = [];
  const s = input;
  let i = 0;
  while (i < s.length) {
    const c = s[i]!;
    if (c === " " || c === "\t") {
      i++;
      continue;
    }
    let tok = "";
    while (i < s.length && s[i] !== " " && s[i] !== "\t") {
      const ch = s[i]!;
      if (ch === '"') {
        tok += '"';
        i++;
        while (i < s.length && s[i] !== '"') {
          tok += s[i]!;
          i++;
        }
        if (i < s.length) {
          tok += '"';
          i++;
        }
      } else {
        tok += ch;
        i++;
      }
    }
    if (tok.length > 0) out.push(tok);
  }
  return out;
}

function unquote(s: string): string {
  if (s.length >= 2 && s.startsWith('"') && s.endsWith('"')) {
    return s.slice(1, -1);
  }
  return s;
}

export function parseTimeoutMs(value: string | undefined): number | undefined {
  if (value === undefined) return undefined;
  const m = /^(\d+)(ms|s|m)?$/.exec(value.trim());
  if (!m) {
    throw new BuildError({ code: "BAD_TIMEOUT", message: `BAD_TIMEOUT: invalid timeout "${value}"` });
  }
  const n = Number(m[1]);
  if (n <= 0) {
    throw new BuildError({ code: "BAD_TIMEOUT", message: `BAD_TIMEOUT: timeout must be > 0 (got "${value}")` });
  }
  const unit = m[2] ?? "ms";
  const factor = unit === "ms" ? 1 : unit === "s" ? 1000 : 60_000;
  return n * factor;
}
