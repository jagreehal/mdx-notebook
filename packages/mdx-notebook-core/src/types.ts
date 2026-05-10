export type Loc = { file: string; line: number; column: number };

export type InlineCell = {
  kind: "inline";
  id: string;
  lang: string;
  code: string;
  timeout?: number;
  cache?: boolean;
  env?: string;
  dependsOn?: string[];
  loc: Loc;
};

export type FileCell = {
  kind: "file";
  id: string;
  lang: string;
  src: string;
  timeout?: number;
  cache?: boolean;
  env?: string;
  dependsOn?: string[];
  loc: Loc;
};

export type IpynbCell = {
  kind: "ipynb";
  id: string;
  src: string;
  cellIndex: number;
  loc: Loc;
};

export type Cell = InlineCell | FileCell | IpynbCell;

export type LogEvent = {
  ts: number;
  stream: "stdout" | "stderr";
  text: string;
};

export type IpynbOutput =
  | { type: "stream"; name: "stdout" | "stderr"; text: string }
  | { type: "display_data" | "execute_result"; data: Record<string, unknown> }
  | { type: "error"; ename: string; evalue: string; traceback: string[] };

export type CellOutput = {
  cellId: string;
  status: "ok" | "error" | "timeout";
  durationMs: number;
  exitCode: number;
  stdout: LogEvent[];
  stderr: LogEvent[];
  result?: unknown;
  error?: { name: string; message: string; stack?: string };
  ipynbOutputs?: IpynbOutput[];
};

export type Manifest = {
  pageId: string;
  cells: Record<string, CellOutput>;
  builtAt: number;
};

export interface RunCtx {
  signal: AbortSignal;
  cwd: string;
  env: Record<string, string>;
  timeoutMs: number;
}

export interface Runner {
  language: string;
  version: string;
  canHandle(cell: Cell): boolean;
  run(cell: Cell, ctx: RunCtx): Promise<CellOutput>;
}
