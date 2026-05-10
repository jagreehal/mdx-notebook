import { BuildError } from "./errors.js";
import type { IpynbOutput } from "./types.js";

export interface ParsedIpynbCodeCell {
  cellIndex: number;        // index among code cells only
  source: string;
  outputs: IpynbOutput[];
}

export interface ParsedIpynb {
  codeCells: ParsedIpynbCodeCell[];
}

interface RawCell {
  cell_type: string;
  source: string | string[];
  outputs?: RawOutput[];
}

interface RawOutput {
  output_type: string;
  name?: string;
  text?: string | string[];
  data?: Record<string, string | string[]>;
  ename?: string;
  evalue?: string;
  traceback?: string[];
}

export function parseIpynb(input: string): ParsedIpynb {
  let json: unknown;
  try {
    json = JSON.parse(input);
  } catch (cause) {
    throw new BuildError({ code: "IPYNB_PARSE", message: "IPYNB_PARSE: invalid JSON in .ipynb", cause });
  }
  if (!json || typeof json !== "object" || !Array.isArray((json as { cells?: unknown }).cells)) {
    throw new BuildError({ code: "IPYNB_PARSE", message: "IPYNB_PARSE: .ipynb missing 'cells' array" });
  }
  const rawCells = (json as { cells: RawCell[] }).cells;
  const codeCells: ParsedIpynbCodeCell[] = [];
  let codeIdx = 0;
  for (const cell of rawCells) {
    if (cell.cell_type !== "code") continue;
    codeCells.push({
      cellIndex: codeIdx++,
      source: joinText(cell.source),
      outputs: (cell.outputs ?? []).map(convertOutput)
    });
  }
  return { codeCells };
}

export function extractIpynbCells(
  nb: ParsedIpynb,
  selector: number[] | null
): ParsedIpynbCodeCell[] {
  if (selector === null) return nb.codeCells;
  const wanted = new Set(selector);
  return nb.codeCells.filter((c) => wanted.has(c.cellIndex));
}

function joinText(text: string | string[]): string {
  return Array.isArray(text) ? text.join("") : text;
}

function convertOutput(raw: RawOutput): IpynbOutput {
  switch (raw.output_type) {
    case "stream": {
      const name = raw.name === "stderr" ? "stderr" : "stdout";
      return { type: "stream", name, text: joinText(raw.text ?? "") };
    }
    case "display_data":
    case "execute_result": {
      const data: Record<string, unknown> = {};
      for (const [mime, value] of Object.entries(raw.data ?? {})) {
        data[mime] = typeof value === "string" ? value : joinText(value);
      }
      return { type: raw.output_type, data };
    }
    case "error": {
      return {
        type: "error",
        ename: raw.ename ?? "Error",
        evalue: raw.evalue ?? "",
        traceback: raw.traceback ?? []
      };
    }
    default:
      // Unknown output type: preserve as a stream entry to avoid losing info
      return { type: "stream", name: "stdout", text: `[unknown output_type: ${raw.output_type}]` };
  }
}
