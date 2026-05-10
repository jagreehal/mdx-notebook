import { createRequire } from "node:module";
import type { Reporter } from "vitest/node";
import { defineConfig } from "vitest/config";

const require = createRequire(import.meta.url);
const { StoryReporter } = require("executable-stories-vitest/reporter");

export default defineConfig({
  test: {
    include: ["tests/**/*.story.test.ts"],
    testTimeout: 60_000,
    reporters: [
      "default",
      new StoryReporter({
        formats: ["markdown"],
        outputDir: "docs/evidence",
        outputName: "vitest-stories",
        rawRunPath: ".executable-stories/vitest-raw-run.json",
        output: { mode: "aggregated" },
        markdown: {
          title: "mdx-notebook Vitest Stories",
          includeStatusIcons: true,
          includeErrors: true,
          includeMetadata: true,
          sortScenarios: "source"
        }
      }) as unknown as Reporter
    ]
  }
});
