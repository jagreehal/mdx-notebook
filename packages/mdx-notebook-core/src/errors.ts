import type { Loc } from "./types.js";

export type BuildErrorCode =
  | "MISSING_ID"
  | "DUPLICATE_ID"
  | "MISSING_SRC"
  | "UNKNOWN_LANG"
  | "BAD_CELLS_SELECTOR"
  | "BAD_CHECKPOINT"
  | "IPYNB_PARSE"
  | "BAD_DEPENDS_ON"
  | "BAD_MATRIX"
  | "CYCLIC_DEPENDS_ON"
  | "UNKNOWN_DEP"
  | "BAD_TIMEOUT"
  | "STRICT_CELL_FAILURE"
  | "INTERNAL";

export interface BuildErrorInit {
  code: BuildErrorCode | string;
  message: string;
  loc?: Loc;
  cause?: unknown;
}

export class BuildError extends Error {
  readonly code: string;
  readonly loc: Loc | undefined;

  constructor(init: BuildErrorInit) {
    const prefix = init.loc ? `${init.loc.file}:${init.loc.line}:${init.loc.column}: ` : "";
    super(prefix + init.message, { cause: init.cause });
    this.name = "BuildError";
    this.code = init.code;
    this.loc = init.loc;
  }
}

export function isBuildError(value: unknown): value is BuildError {
  return value instanceof BuildError;
}
