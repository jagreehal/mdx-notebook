import { BuildError } from "./errors.js";
import type { Cell, Runner } from "./types.js";

const REGISTRY = new Map<string, Runner>();

export function registerRunner(runner: Runner): void {
  if (!runner.language) {
    throw new BuildError({ code: "INTERNAL", message: "runner.language must be non-empty" });
  }
  REGISTRY.set(runner.language, runner);
}

export function getRunner(language: string, cell?: Cell): Runner | undefined {
  const r = REGISTRY.get(language);
  if (!r) return undefined;
  if (cell && !r.canHandle(cell)) return undefined;
  return r;
}

export function listRunners(): Runner[] {
  return [...REGISTRY.values()];
}

export function clearRegistry(): void {
  REGISTRY.clear();
}
