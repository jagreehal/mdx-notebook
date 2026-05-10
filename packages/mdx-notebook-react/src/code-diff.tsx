export interface CodeDiffProps {
  before: string;
  after: string;
  language?: string;
  leftLabel?: string;
  rightLabel?: string;
}

export function CodeDiff({ before, after, language, leftLabel = "Before", rightLabel = "After" }: CodeDiffProps) {
  const beforeLines = before.split("\n");
  const afterLines = after.split("\n");
  const beforeSet = new Set(beforeLines);
  const afterSet = new Set(afterLines);
  const langClass = language ? `language-${language}` : undefined;
  return (
    <div className="mdx-nb mdx-nb-diff">
      <div className="mdx-nb-diff-side">
        <div className="mdx-nb-diff-title">{leftLabel}</div>
        <pre><code className={langClass}>{beforeLines.map((line, i) => (
          <span key={i} className={`mdx-nb-diff-line ${afterSet.has(line) ? "mdx-nb-diff-common" : "mdx-nb-diff-only-left"}`}>{line}{"\n"}</span>
        ))}</code></pre>
      </div>
      <div className="mdx-nb-diff-side">
        <div className="mdx-nb-diff-title">{rightLabel}</div>
        <pre><code className={langClass}>{afterLines.map((line, i) => (
          <span key={i} className={`mdx-nb-diff-line ${beforeSet.has(line) ? "mdx-nb-diff-common" : "mdx-nb-diff-only-right"}`}>{line}{"\n"}</span>
        ))}</code></pre>
      </div>
    </div>
  );
}
