import { useCellOutput } from "mdx-notebook-core/runtime/react";

export interface DiffRunsProps {
  /** Either a single cellId with `leftVariant`+`rightVariant`, or two cellIds. */
  left: string;
  right: string;
  /** When set, treats `left`/`right` as a single cellId and these as variant labels. */
  leftVariant?: string;
  rightVariant?: string;
  leftLabel?: string;
  rightLabel?: string;
}

export function DiffRuns({ left, right, leftVariant, rightVariant, leftLabel, rightLabel }: DiffRunsProps) {
  const isVariantMode = left === right && leftVariant && rightVariant;
  const leftOut = useCellOutput(left);
  const rightOut = useCellOutput(right);

  const leftLines = isVariantMode
    ? ((leftOut as any).variants?.[leftVariant!]?.stdout ?? []).map((e: any) => e.text)
    : leftOut.stdout.map((e) => e.text);
  const rightLines = isVariantMode
    ? ((rightOut as any).variants?.[rightVariant!]?.stdout ?? []).map((e: any) => e.text)
    : rightOut.stdout.map((e) => e.text);

  const leftSet = new Set(leftLines);
  const rightSet = new Set(rightLines);

  return (
    <div className="mdx-nb mdx-nb-diff">
      <div className="mdx-nb-diff-side">
        <div className="mdx-nb-diff-title">{leftLabel ?? (isVariantMode ? leftVariant : left)}</div>
        <pre><code>{leftLines.map((line, i) => (
          <span key={i} className={`mdx-nb-diff-line ${rightSet.has(line) ? "mdx-nb-diff-common" : "mdx-nb-diff-only-left"}`}>{line}{"\n"}</span>
        ))}</code></pre>
      </div>
      <div className="mdx-nb-diff-side">
        <div className="mdx-nb-diff-title">{rightLabel ?? (isVariantMode ? rightVariant : right)}</div>
        <pre><code>{rightLines.map((line, i) => (
          <span key={i} className={`mdx-nb-diff-line ${leftSet.has(line) ? "mdx-nb-diff-common" : "mdx-nb-diff-only-right"}`}>{line}{"\n"}</span>
        ))}</code></pre>
      </div>
    </div>
  );
}
