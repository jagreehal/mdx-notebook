import type {
  CellOutput,
  CheckpointResult,
  CheckpointSpec,
  TutorialMeta,
  TutorialProgress
} from "./types.js";

export function parseTutorialMetaFromSource(source: string): TutorialMeta | undefined {
  const fm = extractFrontmatter(source);
  if (!fm) return undefined;

  const out: TutorialMeta = {};
  const asString = (k: string) => {
    const v = fm[k];
    return typeof v === "string" && v.length > 0 ? v : undefined;
  };
  const asNumber = (k: string) => {
    const v = fm[k];
    if (typeof v === "number") return Number.isFinite(v) ? v : undefined;
    if (typeof v === "string" && v.trim() !== "") {
      const n = Number(v.trim());
      return Number.isFinite(n) ? n : undefined;
    }
    return undefined;
  };
  const asStringArray = (k: string) => {
    const v = fm[k];
    if (Array.isArray(v)) return v.map((x) => String(x)).filter(Boolean);
    if (typeof v === "string" && v.trim() !== "") return [v.trim()];
    return undefined;
  };

  const lessonId = asString("lessonId");
  const title = asString("title");
  const order = asNumber("order");
  const estimatedMinutes = asNumber("estimatedMinutes");
  const difficulty = asString("difficulty");
  const audience = asString("audience");
  const summary = asString("summary");
  const prerequisites = asStringArray("prerequisites");
  const outcomes = asStringArray("outcomes");
  const tags = asStringArray("tags");
  const troubleshooting = asStringArray("troubleshooting");

  Object.assign(out, {
    ...(lessonId !== undefined ? { lessonId } : {}),
    ...(title !== undefined ? { title } : {}),
    ...(order !== undefined ? { order } : {}),
    ...(estimatedMinutes !== undefined ? { estimatedMinutes } : {}),
    ...(difficulty !== undefined ? { difficulty } : {}),
    ...(audience !== undefined ? { audience } : {}),
    ...(summary !== undefined ? { summary } : {}),
    ...(prerequisites !== undefined ? { prerequisites } : {}),
    ...(outcomes !== undefined ? { outcomes } : {}),
    ...(tags !== undefined ? { tags } : {}),
    ...(troubleshooting !== undefined ? { troubleshooting } : {})
  });

  return Object.keys(out).length > 0 ? out : undefined;
}

export function evaluateCheckpoints(
  outputs: Record<string, CellOutput>,
  specs: CheckpointSpec[]
): CheckpointResult[] {
  return specs.map((spec) => {
    const output = outputs[spec.cellId];
    const path = spec.path ?? "result";
    const expected = spec.expected;
    const required = spec.required !== false;
    const weight = spec.weight ?? 1;

    if (!output) {
      const base: CheckpointResult = {
        id: spec.id,
        cellId: spec.cellId,
        passed: false,
        required,
        weight,
        op: spec.op,
        path,
        ...(expected !== undefined ? { expected } : {}),
        ...(spec.title !== undefined ? { title: spec.title } : {}),
        ...(spec.hint !== undefined ? { hint: spec.hint } : {}),
        message: `checkpoint references unknown cell "${spec.cellId}"`
      };
      return base;
    }

    const actual = resolvePath(output, path);
    const { passed, message } = compare(actual, spec.op, expected);
    return {
      id: spec.id,
      cellId: spec.cellId,
      passed,
      required,
      weight,
      op: spec.op,
      path,
      ...(expected !== undefined ? { expected } : {}),
      ...(actual !== undefined ? { actual } : {}),
      ...(spec.title !== undefined ? { title: spec.title } : {}),
      ...(spec.hint !== undefined ? { hint: spec.hint } : {}),
      ...(message !== undefined ? { message } : {})
    };
  });
}

export function computeProgress(
  checkpoints: CheckpointResult[],
  tutorial: TutorialMeta | undefined,
  completedLessons: string[] | undefined
): TutorialProgress {
  let requiredTotal = 0;
  let requiredPassed = 0;
  let optionalTotal = 0;
  let optionalPassed = 0;
  let weightedScore = 0;
  let weightedMax = 0;

  for (const c of checkpoints) {
    if (c.required) {
      requiredTotal++;
      if (c.passed) requiredPassed++;
    } else {
      optionalTotal++;
      if (c.passed) optionalPassed++;
    }
    weightedMax += c.weight;
    if (c.passed) weightedScore += c.weight;
  }

  const requiredPrereqs = tutorial?.prerequisites ?? [];
  const done = new Set(completedLessons ?? []);
  const missing = requiredPrereqs.filter((x) => !done.has(x));
  const prereqsSatisfied = missing.length === 0;
  const percent = weightedMax === 0 ? (prereqsSatisfied ? 100 : 0) : Math.round((weightedScore / weightedMax) * 100);

  return {
    requiredTotal,
    requiredPassed,
    optionalTotal,
    optionalPassed,
    weightedScore,
    weightedMax,
    percent,
    completed: requiredPassed === requiredTotal && prereqsSatisfied,
    prerequisites: {
      required: requiredPrereqs,
      missing,
      satisfied: prereqsSatisfied
    }
  };
}

function compare(actual: unknown, op: CheckpointSpec["op"], expected: unknown): { passed: boolean; message?: string } {
  switch (op) {
    case "exists": {
      const want = expected === undefined ? true : Boolean(expected);
      const has = actual !== undefined && actual !== null;
      return withMessage(has === want, `expected exists=${want}, got ${has}`);
    }
    case "equals": {
      const passed = deepEqual(actual, expected);
      return withMessage(passed, "actual did not equal expected");
    }
    case "includes": {
      if (typeof actual === "string") {
        const needle = String(expected ?? "");
        const passed = actual.includes(needle);
        return withMessage(passed, `string did not include "${needle}"`);
      }
      if (Array.isArray(actual)) {
        const passed = actual.some((x) => deepEqual(x, expected));
        return withMessage(passed, "array did not include expected value");
      }
      return { passed: false, message: "includes requires a string or array actual value" };
    }
    case "regex": {
      const re = new RegExp(String(expected ?? ""));
      const passed = re.test(String(actual ?? ""));
      return withMessage(passed, `value did not match regex ${re}`);
    }
    case "gt":
    case "gte":
    case "lt":
    case "lte": {
      const a = Number(actual);
      const b = Number(expected);
      if (!Number.isFinite(a) || !Number.isFinite(b)) {
        return { passed: false, message: "numeric comparison requires finite numbers" };
      }
      const passed =
        op === "gt" ? a > b :
          op === "gte" ? a >= b :
            op === "lt" ? a < b :
              a <= b;
      return withMessage(passed, `comparison failed: ${a} ${op} ${b}`);
    }
    default:
      return { passed: false, message: `unknown checkpoint operator "${String(op)}"` };
  }
}

function withMessage(passed: boolean, failedMessage: string): { passed: boolean; message?: string } {
  return passed ? { passed } : { passed, message: failedMessage };
}

function resolvePath(output: CellOutput, path: string): unknown {
  if (path === "stdout") return output.stdout.map((e) => e.text).join("\n");
  if (path === "stderr") return output.stderr.map((e) => e.text).join("\n");
  if (path === "status") return output.status;
  if (path === "exitCode") return output.exitCode;
  if (path === "durationMs") return output.durationMs;
  return getByPath(output as unknown as Record<string, unknown>, path);
}

function getByPath(root: Record<string, unknown>, path: string): unknown {
  const parts = path.split(".").filter(Boolean);
  let cur: unknown = root;
  for (const part of parts) {
    if (cur === null || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[part];
  }
  return cur;
}

function deepEqual(a: unknown, b: unknown): boolean {
  return stableStringify(a) === stableStringify(b);
}

function stableStringify(value: unknown): string {
  return JSON.stringify(sortRec(value));
}

function sortRec(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortRec);
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(value as Record<string, unknown>).sort()) {
      out[k] = sortRec((value as Record<string, unknown>)[k]);
    }
    return out;
  }
  return value;
}

function extractFrontmatter(source: string): Record<string, unknown> | undefined {
  if (!source.startsWith("---\n")) return undefined;
  const end = source.indexOf("\n---\n", 4);
  if (end === -1) return undefined;
  const body = source.slice(4, end);
  return parseSimpleYaml(body);
}

function parseSimpleYaml(body: string): Record<string, unknown> {
  const lines = body.split(/\r?\n/);
  const out: Record<string, unknown> = {};
  let i = 0;
  while (i < lines.length) {
    const line = lines[i]!.trimEnd();
    i++;
    if (!line || line.trimStart().startsWith("#")) continue;
    const m = /^([A-Za-z0-9_-]+):\s*(.*)$/.exec(line);
    if (!m) continue;
    const key = m[1]!;
    const raw = m[2]!.trim();
    if (raw === "") {
      const arr: string[] = [];
      while (i < lines.length) {
        const li = lines[i]!;
        const mm = /^\s*-\s*(.+)\s*$/.exec(li);
        if (!mm) break;
        arr.push(mm[1]!);
        i++;
      }
      out[key] = arr;
      continue;
    }
    if (raw.startsWith("[") && raw.endsWith("]")) {
      const items = raw.slice(1, -1).split(",").map((x) => x.trim()).filter(Boolean).map(unquote);
      out[key] = items;
      continue;
    }
    const num = Number(raw);
    if (!Number.isNaN(num) && raw !== "") {
      out[key] = num;
      continue;
    }
    out[key] = unquote(raw);
  }
  return out;
}

function unquote(v: string): string {
  if ((v.startsWith("\"") && v.endsWith("\"")) || (v.startsWith("'") && v.endsWith("'"))) {
    return v.slice(1, -1);
  }
  return v;
}
