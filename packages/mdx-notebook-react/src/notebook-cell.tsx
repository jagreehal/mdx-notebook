import { useCellOutput } from "mdx-notebook-core/runtime/react";
import { CodeBlock } from "./code-block.js";
import { Stdout } from "./stdout.js";
import { Stderr } from "./stderr.js";
import { ResultJSON } from "./result-json.js";
import { IpynbOutputs } from "./ipynb-outputs.js";

export interface NotebookCellProps {
  cellId: string;
  code?: string;
  language?: string;
  /** Show stdout. Default true. */
  showStdout?: boolean;
  /** Show stderr. Default true. */
  showStderr?: boolean;
  /** Show result JSON. Default true. */
  showResult?: boolean;
}

export function NotebookCell({
  cellId,
  code,
  language,
  showStdout = true,
  showStderr = true,
  showResult = true
}: NotebookCellProps) {
  const out = useCellOutput(cellId);
  const isIpynb = (out.ipynbOutputs?.length ?? 0) > 0;
  return (
    <div className="mdx-nb-cell">
      {code !== undefined && (
        <div className="mdx-nb-cell-source">
          <CodeBlock code={code} {...(language !== undefined ? { language } : {})} />
        </div>
      )}
      <div className="mdx-nb-cell-output">
        {isIpynb && <IpynbOutputs cellId={cellId} />}
        {!isIpynb && (
          <>
            {showStdout && <Stdout cellId={cellId} />}
            {showStderr && <Stderr cellId={cellId} />}
            {showResult && <ResultJSON cellId={cellId} />}
          </>
        )}
        {out.status === "error" && (
          <div className="mdx-nb-error">
            <strong>{out.error?.name ?? "Error"}</strong>: {out.error?.message ?? "unknown"}
          </div>
        )}
        {out.status === "timeout" && (
          <div className="mdx-nb-error">Cell timed out after {out.durationMs}ms</div>
        )}
      </div>
    </div>
  );
}
