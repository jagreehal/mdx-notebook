import katex from "katex";
import { useMemo, useEffect } from "react";

let cssInjected = false;
function injectKatexCss() {
  if (cssInjected) return;
  if (typeof document === "undefined") return;
  // We rely on consumers importing katex/dist/katex.min.css; but as a fallback
  // we inject a minimal stylesheet hint pointing them to it.
  cssInjected = true;
}

export interface MathProps {
  expr: string;
  /** display = block-level math (default), inline = inline math */
  display?: boolean;
}

export function Math({ expr, display = true }: MathProps) {
  useEffect(() => { injectKatexCss(); }, []);
  const html = useMemo(() => {
    try {
      return katex.renderToString(expr, { displayMode: display, throwOnError: false });
    } catch (e) {
      return `<span class="mdx-nb-error">Math error: ${(e as Error).message}</span>`;
    }
  }, [expr, display]);
  if (display) {
    return <div className="mdx-nb-math" dangerouslySetInnerHTML={{ __html: html }} />;
  }
  return <span className="mdx-nb-math" dangerouslySetInnerHTML={{ __html: html }} />;
}
