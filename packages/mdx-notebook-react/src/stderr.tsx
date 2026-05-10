import { useCellOutput } from "mdx-notebook-core";

export function Stderr({ cellId }: { cellId: string }) {
  const out = useCellOutput(cellId);
  if (out.stderr.length === 0) return null;
  return (
    <pre className="mdx-nb mdx-nb-stderr">
      <code>
        {out.stderr.map((e, i) => (
          <span key={i} className="mdx-nb-line">{e.text}{"\n"}</span>
        ))}
      </code>
    </pre>
  );
}
