let injected = false;
const CSS = `
.mdx-nb { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 13px; line-height: 1.5; }
.mdx-nb pre { margin: 0; padding: 0.5rem 0.75rem; background: #f6f7f9; border-radius: 4px; overflow-x: auto; white-space: pre-wrap; }
.mdx-nb pre.mdx-nb-stderr { background: #fff5f5; border-left: 3px solid #d33; }
.mdx-nb-error { color: #c00; padding: 0.5rem 0.75rem; background: #fff5f5; border-left: 3px solid #d33; border-radius: 4px; }
.mdx-nb-error pre { background: transparent; padding: 0; }
.mdx-nb-line { display: block; }
.mdx-nb-math { font-size: 1.05em; }
.mdx-nb-math.display { display: block; margin: 0.5rem 0; }
.mdx-nb-cell { margin: 1rem 0; border: 1px solid #e1e4e8; border-radius: 6px; overflow: hidden; }
.mdx-nb-cell-source { background: #fafbfc; border-bottom: 1px solid #e1e4e8; }
.mdx-nb-cell-source pre { margin: 0; background: transparent; padding: 0.5rem 0.75rem; }
.mdx-nb-cell-output { padding: 0.5rem 0.75rem; }
.mdx-nb-cell-output pre { margin: 0.25rem 0; }
`;

export function injectStyles(): void {
  if (injected) return;
  if (typeof document === "undefined") return;
  const tag = document.createElement("style");
  tag.setAttribute("data-mdx-notebook", "true");
  tag.textContent = CSS;
  document.head.appendChild(tag);
  injected = true;
}
