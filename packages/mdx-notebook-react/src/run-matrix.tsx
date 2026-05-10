import { useState } from "react";
import { useCellOutput } from "mdx-notebook-core/runtime/react";
import { JsonView } from "./json-view.js";

export interface RunMatrixProps {
  cellId: string;
  showStdout?: boolean;
  showStderr?: boolean;
  showResult?: boolean;
}

export function RunMatrix({ cellId, showStdout = true, showStderr = true, showResult = true }: RunMatrixProps) {
  const out = useCellOutput(cellId);
  const variants = (out as any).variants as Record<string, any> | undefined;
  const labels = variants ? Object.keys(variants) : [];
  const [active, setActive] = useState(labels[0] ?? "");

  if (!variants || labels.length === 0) {
    return <div className="mdx-nb-error">No matrix variants for cell "{cellId}"</div>;
  }
  const current = variants[active] ?? variants[labels[0]!]!;

  return (
    <div className="mdx-nb mdx-nb-matrix">
      <div className="mdx-nb-matrix-tabs" role="tablist">
        {labels.map((label) => {
          const variant = variants[label]!;
          const isActive = label === active;
          const icon = variant.status === "ok" ? "✓" : variant.status === "timeout" ? "⏱" : "✗";
          return (
            <button
              key={label}
              type="button"
              role="tab"
              aria-selected={isActive}
              className={`mdx-nb-matrix-tab ${isActive ? "mdx-nb-matrix-tab-active" : ""} mdx-nb-matrix-tab-${variant.status}`}
              onClick={() => setActive(label)}
            >
              <span className="mdx-nb-matrix-tab-icon">{icon}</span>
              <span className="mdx-nb-matrix-tab-label">{label}</span>
              <span className="mdx-nb-matrix-tab-duration">{variant.durationMs}ms</span>
            </button>
          );
        })}
      </div>
      <div className="mdx-nb-matrix-body" role="tabpanel">
        {current.status === "error" && current.error && (
          <div className="mdx-nb-error">
            <strong>{current.error.name}</strong>: {current.error.message}
          </div>
        )}
        {current.status === "timeout" && (
          <div className="mdx-nb-error">Cell timed out after {current.durationMs}ms</div>
        )}
        {showStdout && current.stdout.length > 0 && (
          <pre className="mdx-nb"><code>{current.stdout.map((e: any) => e.text).join("\n")}</code></pre>
        )}
        {showStderr && current.stderr.length > 0 && (
          <pre className="mdx-nb mdx-nb-stderr"><code>{current.stderr.map((e: any) => e.text).join("\n")}</code></pre>
        )}
        {showResult && current.result !== undefined && <JsonView value={current.result} />}
      </div>
    </div>
  );
}
