import { useCellOutput } from "mdx-notebook-core/runtime/react";

export function Stdout({ cellId }: { cellId: string }) {
  const out = useCellOutput(cellId);
  if (out.stdout.length === 0) return null;
  return (
    <pre className="mdx-nb">
      <code>
        {out.stdout.map((e, i) => (
          <span key={i} className="mdx-nb-line">{e.text}{"\n"}</span>
        ))}
      </code>
    </pre>
  );
}
