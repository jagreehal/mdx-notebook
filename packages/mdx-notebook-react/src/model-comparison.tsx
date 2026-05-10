import type { ReactNode } from "react";

export interface ComparisonSide {
  title: string;
  content: ReactNode;
}

export function ModelComparison({ left, right }: { left: ComparisonSide; right: ComparisonSide }) {
  return (
    <div className="mdx-nb mdx-nb-compare">
      <div className="mdx-nb-compare-side">
        <div className="mdx-nb-compare-title">{left.title}</div>
        <div className="mdx-nb-compare-body">{left.content}</div>
      </div>
      <div className="mdx-nb-compare-side">
        <div className="mdx-nb-compare-title">{right.title}</div>
        <div className="mdx-nb-compare-body">{right.content}</div>
      </div>
    </div>
  );
}
