import { describe, expect, it } from "vitest";
import { computeProgress, evaluateCheckpoints, parseTutorialMetaFromSource } from "../src/curriculum.js";
import type { CellOutput, CheckpointSpec } from "../src/types.js";

const ok = (id: string, result: unknown, stdout = ""): CellOutput => ({
  cellId: id,
  status: "ok",
  durationMs: 1,
  exitCode: 0,
  stdout: stdout ? [{ ts: 1, stream: "stdout", text: stdout }] : [],
  stderr: [],
  result
});

describe("parseTutorialMetaFromSource", () => {
  it("parses simple frontmatter fields", () => {
    const src = `---
lessonId: lesson-02
title: "Agents"
order: 2
estimatedMinutes: 12
prerequisites:
  - lesson-01
---

# Title
`;
    const meta = parseTutorialMetaFromSource(src)!;
    expect(meta.lessonId).toBe("lesson-02");
    expect(meta.order).toBe(2);
    expect(meta.estimatedMinutes).toBe(12);
    expect(meta.prerequisites).toEqual(["lesson-01"]);
  });
});

describe("evaluateCheckpoints + computeProgress", () => {
  it("evaluates checks and computes weighted progress", () => {
    const outputs = {
      sum: ok("sum", 10, "ran sum"),
      nums: ok("nums", [1, 2, 3])
    };
    const specs: CheckpointSpec[] = [
      {
        id: "c1",
        cellId: "sum",
        path: "result",
        op: "equals",
        expected: 10,
        required: true,
        weight: 2,
        loc: { file: "x.mdx", line: 1, column: 1 }
      },
      {
        id: "c2",
        cellId: "sum",
        path: "stdout",
        op: "includes",
        expected: "ran",
        required: false,
        weight: 1,
        loc: { file: "x.mdx", line: 2, column: 1 }
      }
    ];

    const checks = evaluateCheckpoints(outputs, specs);
    expect(checks.every((c) => c.passed)).toBe(true);
    const progress = computeProgress(checks, { prerequisites: ["lesson-01"] }, ["lesson-01"]);
    expect(progress).toMatchObject({
      requiredTotal: 1,
      requiredPassed: 1,
      optionalTotal: 1,
      optionalPassed: 1,
      weightedScore: 3,
      weightedMax: 3,
      percent: 100,
      completed: true
    });
  });
});
