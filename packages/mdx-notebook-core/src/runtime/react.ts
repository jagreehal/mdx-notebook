import {
  createContext,
  createElement,
  useContext,
  useSyncExternalStore,
  type ReactNode
} from "react";
import type { CellOutput } from "../types.js";
import type { OutputStore } from "./store.js";

const OutputContext = createContext<OutputStore | null>(null);

export function OutputProvider(props: { store: OutputStore; children: ReactNode }) {
  return createElement(OutputContext.Provider, { value: props.store }, props.children);
}

export function useCellOutput<T = unknown>(cellId: string): CellOutput & { result?: T } {
  const store = useContext(OutputContext);
  if (!store) throw new Error("useCellOutput must be used within an <OutputProvider>");
  const value = useSyncExternalStore(
    (cb) => store.subscribe(cellId, cb),
    () => store.get(cellId),
    () => store.get(cellId)
  );
  return value as CellOutput & { result?: T };
}

export { OutputContext };
