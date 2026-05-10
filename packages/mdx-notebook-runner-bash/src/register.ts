import { registerRunner } from "mdx-notebook-core";
import { runnerBash } from "./runner.js";
registerRunner(runnerBash);
export {};
