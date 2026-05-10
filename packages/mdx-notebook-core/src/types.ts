export type Loc = { file: string; line: number; column: number };

export type { MatrixVariant } from "./parse-fence.js";

export type InlineCell = {
  kind: "inline";
  id: string;
  lang: string;
  code: string;
  timeout?: number;
  cache?: boolean;
  env?: string;
  dependsOn?: string[];
  matrix?: import("./parse-fence.js").MatrixVariant[];
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
  matrix?: import("./parse-fence.js").MatrixVariant[];
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
  variants?: Record<string, CellOutput>; // matrix runs
};

export type Manifest = {
  pageId: string;
  cells: Record<string, CellOutput>;
  builtAt: number;
  tutorial?: TutorialMeta;
  checkpoints?: CheckpointResult[];
  progress?: TutorialProgress;
};

export type TutorialMeta = {
  lessonId?: string;
  title?: string;
  order?: number;
  estimatedMinutes?: number;
  difficulty?: "beginner" | "intermediate" | "advanced" | string;
  audience?: string;
  summary?: string;
  prerequisites?: string[];
  outcomes?: string[];
  tags?: string[];
  troubleshooting?: string[];
};

export type CheckpointOp =
  | "equals"
  | "includes"
  | "regex"
  | "exists"
  | "gt"
  | "gte"
  | "lt"
  | "lte";

export type CheckpointSpec = {
  id: string;
  cellId: string;
  path?: string;
  op: CheckpointOp;
  expected?: unknown;
  required?: boolean;
  weight?: number;
  title?: string;
  hint?: string;
  loc: Loc;
};

export type CheckpointResult = {
  id: string;
  cellId: string;
  passed: boolean;
  required: boolean;
  weight: number;
  op: CheckpointOp;
  path: string;
  expected?: unknown;
  actual?: unknown;
  title?: string;
  hint?: string;
  message?: string;
};

export type TutorialProgress = {
  requiredTotal: number;
  requiredPassed: number;
  optionalTotal: number;
  optionalPassed: number;
  weightedScore: number;
  weightedMax: number;
  percent: number;
  completed: boolean;
  prerequisites: {
    required: string[];
    missing: string[];
    satisfied: boolean;
  };
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
