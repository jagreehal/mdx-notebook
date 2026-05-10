import type { CellOutput, Manifest } from "../types.js";

export interface OutputStore {
  get(cellId: string): CellOutput;
  setResult(cellId: string, next: unknown): void;
  subscribe(cellId: string, fn: () => void): () => void;
}

export function createOutputStore(manifest: Manifest): OutputStore {
  const cells: Record<string, CellOutput> = { ...manifest.cells };
  const subs: Record<string, Set<() => void>> = {};

  function notify(cellId: string) {
    const set = subs[cellId];
    if (!set) return;
    for (const fn of set) fn();
  }

  return {
    get(cellId) {
      const c = cells[cellId];
      if (!c) throw new Error(`unknown cellId "${cellId}"`);
      return c;
    },
    setResult(cellId, next) {
      const c = cells[cellId];
      if (!c) throw new Error(`unknown cellId "${cellId}"`);
      cells[cellId] = { ...c, result: next };
      notify(cellId);
    },
    subscribe(cellId, fn) {
      const set = subs[cellId] ?? (subs[cellId] = new Set());
      set.add(fn);
      return () => { set.delete(fn); };
    }
  };
}
