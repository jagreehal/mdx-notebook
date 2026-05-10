import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

export function locateHarness(): string {
  // After build, harness.mjs is colocated under dist/harness/harness.mjs.
  // During tests against src/, this resolves to src/harness/harness.mjs.
  const here = dirname(fileURLToPath(import.meta.url));
  return join(here, "harness.mjs");
}
