import { BuildError } from "./errors.js";

export function parseCellsSelector(input: string | undefined): number[] | null {
  if (input === undefined) return null;
  const raw = input.trim();
  if (raw.length === 0) {
    throw new BuildError({ code: "BAD_CELLS_SELECTOR", message: "BAD_CELLS_SELECTOR: cells selector is empty" });
  }
  const parts = raw.split(",").map((p) => p.trim()).filter((p) => p.length > 0);
  if (parts.length === 0) {
    throw new BuildError({ code: "BAD_CELLS_SELECTOR", message: `BAD_CELLS_SELECTOR: cells selector "${input}" is empty` });
  }
  const out = new Set<number>();
  for (const part of parts) {
    if (part.includes("-")) {
      const [a, b] = part.split("-").map((s) => s.trim());
      const lo = parseNonNegativeInt(a, input);
      const hi = parseNonNegativeInt(b, input);
      if (hi < lo) {
        throw new BuildError({
          code: "BAD_CELLS_SELECTOR",
          message: `BAD_CELLS_SELECTOR: cells range "${part}" is reversed (in "${input}")`
        });
      }
      for (let i = lo; i <= hi; i++) out.add(i);
    } else {
      out.add(parseNonNegativeInt(part, input));
    }
  }
  return [...out].sort((a, b) => a - b);
}

function parseNonNegativeInt(token: string | undefined, original: string): number {
  if (token === undefined || !/^\d+$/.test(token)) {
    throw new BuildError({
      code: "BAD_CELLS_SELECTOR",
      message: `BAD_CELLS_SELECTOR: invalid integer "${token ?? ""}" in cells selector "${original}"`
    });
  }
  return Number(token);
}
