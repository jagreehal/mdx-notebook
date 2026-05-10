import type { ToolCall } from "./message-thread.js";

export interface ToolCallEntry extends ToolCall {
  status?: "ok" | "error" | "pending";
  error?: string;
}

export function ToolCallTimeline({ calls }: { calls: ToolCallEntry[] }) {
  return (
    <ol className="mdx-nb mdx-nb-timeline">
      {calls.map((c, i) => (
        <li key={i} className={`mdx-nb-timeline-item mdx-nb-timeline-${c.status ?? "ok"}`}>
          <span className="mdx-nb-timeline-icon">
            {c.status === "error" ? "✗" : c.status === "pending" ? "⏳" : "✓"}
          </span>
          <details>
            <summary>
              <code>{c.name}</code>
              {typeof c.durationMs === "number" && <span className="mdx-nb-tool-latency"> {c.durationMs}ms</span>}
              {c.error && <span className="mdx-nb-tool-error"> — {c.error}</span>}
            </summary>
            {c.input !== undefined && (<><strong>input</strong><pre><code>{JSON.stringify(c.input, null, 2)}</code></pre></>)}
            {c.output !== undefined && (<><strong>output</strong><pre><code>{JSON.stringify(c.output, null, 2)}</code></pre></>)}
          </details>
        </li>
      ))}
    </ol>
  );
}
