import type { ReactNode } from "react";

export interface BreakpointProps {
  line: number;
  children: ReactNode;
}

export function Breakpoint({ line, children }: BreakpointProps) {
  return (
    <aside className="mdx-nb-breakpoint">
      <span className="mdx-nb-breakpoint-line">L{line}</span>
      <span className="mdx-nb-breakpoint-text">{children}</span>
    </aside>
  );
}
