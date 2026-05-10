import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { TutorialStatus } from "../src/tutorial-status.js";
import { mkManifest } from "./test-utils.js";

describe("TutorialStatus", () => {
  it("renders tutorial metadata, checkpoints, and progress", () => {
    const manifest = {
      ...mkManifest({ sum: { result: 10 } }),
      tutorial: {
        lessonId: "lesson-02",
        title: "Summation",
        estimatedMinutes: 8,
        difficulty: "beginner",
        prerequisites: ["lesson-01"]
      },
      checkpoints: [
        { id: "c1", cellId: "sum", passed: true, required: true, weight: 1, op: "equals", path: "result", expected: 10, actual: 10 }
      ],
      progress: {
        requiredTotal: 1,
        optionalTotal: 0,
        requiredPassed: 1,
        optionalPassed: 0,
        weightedScore: 1,
        weightedMax: 1,
        percent: 100,
        completed: true,
        prerequisites: {
          required: ["lesson-01"],
          missing: [],
          satisfied: true
        }
      }
    };

    render(<TutorialStatus manifest={manifest} />);
    expect(screen.getByText("Tutorial status")).toBeTruthy();
    expect(screen.getByText("Summation")).toBeTruthy();
    expect(screen.getByText("100% complete (1/1 required)")).toBeTruthy();
    expect(screen.getByText("Prerequisites satisfied")).toBeTruthy();
  });

  it("shows blocked prerequisites and failed checkpoint reason", () => {
    const manifest = {
      ...mkManifest({ sum: { result: 8 } }),
      checkpoints: [
        { id: "c1", cellId: "sum", passed: false, required: true, weight: 1, op: "equals", path: "result", expected: 10, actual: 8, message: "expected 10 got 8" }
      ],
      progress: {
        requiredTotal: 1,
        optionalTotal: 0,
        requiredPassed: 0,
        optionalPassed: 0,
        weightedScore: 0,
        weightedMax: 1,
        percent: 0,
        completed: false,
        prerequisites: {
          required: ["lesson-01"],
          missing: ["lesson-01"],
          satisfied: false
        }
      }
    };

    render(<TutorialStatus manifest={manifest} />);
    expect(screen.getByText("Blocked by: lesson-01")).toBeTruthy();
    expect(screen.getByText("expected 10 got 8")).toBeTruthy();
  });
});
