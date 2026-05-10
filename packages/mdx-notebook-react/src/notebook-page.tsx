import { OutputProvider } from "mdx-notebook-core/runtime/react";
import { createOutputStore } from "mdx-notebook-core/runtime";
import type { Manifest } from "mdx-notebook-core";
import { type ReactNode, useMemo, useEffect } from "react";
import { injectStyles } from "./styles.js";

export interface NotebookPageEvent {
  type: "page-mount" | "result-edit";
  pageId: string;
  cellId?: string;
  result?: unknown;
}

export interface NotebookPageProps {
  manifest: Manifest;
  children: ReactNode;
  /** Fires once on mount and whenever a cell result is mutated via setResult. */
  onEvent?: (event: NotebookPageEvent) => void;
}

export function NotebookPage({ manifest, children, onEvent }: NotebookPageProps) {
  const store = useMemo(() => {
    const s = createOutputStore(manifest);
    if (onEvent) {
      const original = s.setResult.bind(s);
      s.setResult = (cellId, next) => {
        original(cellId, next);
        onEvent({ type: "result-edit", pageId: manifest.pageId, cellId, result: next });
      };
    }
    return s;
  }, [manifest, onEvent]);

  useEffect(() => {
    injectStyles();
    onEvent?.({ type: "page-mount", pageId: manifest.pageId });
  }, [manifest.pageId, onEvent]);

  return <OutputProvider store={store}>{children}</OutputProvider>;
}
