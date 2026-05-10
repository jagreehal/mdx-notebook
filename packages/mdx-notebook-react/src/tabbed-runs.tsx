import { useState } from "react";
import { useCellOutput } from "mdx-notebook-core/runtime/react";
import { JsonView } from "./json-view.js";

export interface TabbedRunsProps {
  /** Cells to compare. */
  cellIds: string[];
  /** Optional display labels per cellId; defaults to cellId. */
  labels?: string[];
}

function TabbedRunsImpl({ cellId, isActive }: { cellId: string; isActive: boolean }) {
  const out = useCellOutput(cellId);
  if (!isActive) return null;
  return (
    <div>
      {out.stdout.length > 0 && (
        <pre className="mdx-nb"><code>{out.stdout.map((e) => e.text).join("\n")}</code></pre>
      )}
      {out.result !== undefined && <JsonView value={out.result} />}
    </div>
  );
}

export function TabbedRuns({ cellIds, labels }: TabbedRunsProps) {
  const [active, setActive] = useState(0);
  if (cellIds.length === 0) return null;
  return (
    <div className="mdx-nb mdx-nb-matrix">
      <div className="mdx-nb-matrix-tabs" role="tablist">
        {cellIds.map((id, i) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={i === active}
            className={`mdx-nb-matrix-tab ${i === active ? "mdx-nb-matrix-tab-active" : ""}`}
            onClick={() => setActive(i)}
          >
            {labels?.[i] ?? id}
          </button>
        ))}
      </div>
      <div className="mdx-nb-matrix-body" role="tabpanel">
        {cellIds.map((id, i) => <TabbedRunsImpl key={id} cellId={id} isActive={i === active} />)}
      </div>
    </div>
  );
}
