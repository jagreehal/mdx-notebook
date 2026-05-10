import { OutputProvider } from "mdx-notebook-core";
import { createOutputStore } from "mdx-notebook-core/runtime";
import type { Manifest } from "mdx-notebook-core";
import { type ReactNode, useMemo, useEffect } from "react";
import { injectStyles } from "./styles.js";

export interface NotebookPageProps {
  manifest: Manifest;
  children: ReactNode;
}

export function NotebookPage({ manifest, children }: NotebookPageProps) {
  const store = useMemo(() => createOutputStore(manifest), [manifest]);
  useEffect(() => { injectStyles(); }, []);
  return <OutputProvider store={store}>{children}</OutputProvider>;
}
