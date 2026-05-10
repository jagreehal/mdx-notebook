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
.mdx-nb-thread { display: flex; flex-direction: column; gap: 0.5rem; }
.mdx-nb-msg { padding: 0.5rem 0.75rem; border-radius: 6px; border: 1px solid #e1e4e8; }
.mdx-nb-msg-user { background: #f0f6ff; border-color: #cfe1ff; }
.mdx-nb-msg-assistant { background: #f6fff0; border-color: #d4f0c5; }
.mdx-nb-msg-system { background: #fafbfc; }
.mdx-nb-msg-tool { background: #fff8c5; border-color: #f0d77c; }
.mdx-nb-msg-role { font-size: 0.75em; text-transform: uppercase; letter-spacing: 0.05em; color: #666; margin-bottom: 0.25rem; }
.mdx-nb-msg-content { white-space: pre-wrap; }
.mdx-nb-msg-tools { margin-top: 0.5rem; display: flex; flex-direction: column; gap: 0.25rem; }
.mdx-nb-tool summary { cursor: pointer; }
.mdx-nb-tool-latency { color: #666; font-size: 0.85em; }
.mdx-nb-tool-error { color: #cf222e; }
.mdx-nb-timeline { list-style: none; padding-left: 0; margin: 0; }
.mdx-nb-timeline-item { display: flex; gap: 0.5rem; padding: 0.25rem 0; align-items: flex-start; }
.mdx-nb-timeline-icon { width: 1.5em; text-align: center; }
.mdx-nb-timeline-error .mdx-nb-timeline-icon { color: #cf222e; }
.mdx-nb-timeline-pending .mdx-nb-timeline-icon { color: #d4a72c; }
.mdx-nb-stream code::after { content: "▌"; opacity: 0.5; }
.mdx-nb-compare { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
@media (max-width: 720px) { .mdx-nb-compare { grid-template-columns: 1fr; } }
.mdx-nb-compare-side { border: 1px solid #e1e4e8; border-radius: 6px; padding: 0.6rem 0.8rem; }
.mdx-nb-compare-title { font-weight: 600; margin-bottom: 0.25rem; }
.mdx-nb-streaming { position: relative; }
.mdx-nb-streaming-active .mdx-nb-streaming-caret { animation: mdx-nb-blink 1s steps(2, start) infinite; opacity: 0.6; }
.mdx-nb-line-stderr { color: #d4302a; }
@keyframes mdx-nb-blink { to { visibility: hidden; } }
.mdx-nb-mermaid svg { max-width: 100%; height: auto; }
.mdx-nb-predict { padding: 0.6rem 0.8rem; border: 1px solid #e1e4e8; border-radius: 6px; margin: 0.5rem 0; }
.mdx-nb-predict-prompt { margin-bottom: 0.4rem; }
.mdx-nb-predict-input { padding: 0.25rem 0.4rem; margin-right: 0.4rem; border: 1px solid #ccc; border-radius: 4px; }
.mdx-nb-predict-btn { padding: 0.25rem 0.6rem; cursor: pointer; }
.mdx-nb-predict-result { margin-top: 0.4rem; }
.mdx-nb-predict-correct { color: #1a7f37; }
.mdx-nb-predict-wrong { color: #cf222e; }
.mdx-nb-fillin { display: inline-flex; gap: 0.25rem; align-items: center; }
.mdx-nb-fillin-ok { border-color: #1a7f37 !important; }
.mdx-nb-fillin-wrong { border-color: #cf222e !important; }
.mdx-nb-fillin-hint { font-size: 0.85em; color: #666; }
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
