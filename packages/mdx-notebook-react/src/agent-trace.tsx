import { useCellOutput } from "mdx-notebook-core";
import { JsonView } from "./json-view.js";
import { type ReactNode } from "react";

export function AgentTrace({ cellId }: { cellId: string }) {
  const out = useCellOutput(cellId);
  const groups = groupBySteps(out.stdout.map((e) => e.text));
  return (
    <div className="mdx-nb">
      {groups.map((g, i) => (
        <details key={i} open style={{ marginBottom: "0.5rem" }}>
          <summary style={{ cursor: "pointer", fontWeight: 600 }}>{g.title}</summary>
          <pre><code>{g.lines.join("\n")}</code></pre>
        </details>
      ))}
      {out.result !== undefined && (
        <details open>
          <summary style={{ cursor: "pointer", fontWeight: 600 }}>Final result</summary>
          <JsonView value={out.result} />
        </details>
      )}
      {out.status === "error" && (
        <ErrorBlock>{out.error?.message ?? "Error"}</ErrorBlock>
      )}
    </div>
  );
}

interface Group { title: string; lines: string[]; }

function groupBySteps(lines: string[]): Group[] {
  const groups: Group[] = [];
  let current: Group = { title: "Output", lines: [] };
  const stepRe = /^---\s*Step\s+(\d+)\s*---$/;
  for (const line of lines) {
    const m = stepRe.exec(line.trim());
    if (m) {
      if (current.lines.length > 0 || current.title !== "Output") groups.push(current);
      current = { title: `Step ${m[1]}`, lines: [] };
    } else {
      current.lines.push(line);
    }
  }
  if (current.lines.length > 0 || groups.length === 0) groups.push(current);
  return groups;
}

function ErrorBlock({ children }: { children: ReactNode }) {
  return <div className="mdx-nb-error">{children}</div>;
}
