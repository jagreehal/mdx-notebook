import { useCellOutput } from "mdx-notebook-core";
import { JsonView } from "./json-view.js";

export function ResultJSON({ cellId, indent }: { cellId: string; indent?: number }) {
  const out = useCellOutput(cellId);
  if (out.result === undefined) return null;
  return <JsonView value={out.result} indent={indent} />;
}
