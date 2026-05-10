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
.mdx-nb-matrix { border: 1px solid var(--border, #e1e4e8); border-radius: 6px; overflow: hidden; margin: 1rem 0; }
.mdx-nb-matrix-tabs { display: flex; background: var(--bg-soft, #fafbfc); border-bottom: 1px solid var(--border, #e1e4e8); flex-wrap: wrap; }
.mdx-nb-matrix-tab { padding: 0.5rem 0.85rem; background: transparent; border: none; border-right: 1px solid var(--border, #e1e4e8); cursor: pointer; display: flex; align-items: center; gap: 0.4rem; font-family: inherit; font-size: 0.9em; }
.mdx-nb-matrix-tab:hover { background: var(--bg, #f0f1f3); }
.mdx-nb-matrix-tab-active { background: var(--bg, #fff); font-weight: 600; }
.mdx-nb-matrix-tab-icon { display: inline-flex; width: 1em; }
.mdx-nb-matrix-tab-ok .mdx-nb-matrix-tab-icon { color: #2da44e; }
.mdx-nb-matrix-tab-error .mdx-nb-matrix-tab-icon { color: #cf222e; }
.mdx-nb-matrix-tab-timeout .mdx-nb-matrix-tab-icon { color: #d4a72c; }
.mdx-nb-matrix-tab-duration { color: var(--fg-muted, #666); font-size: 0.85em; }
.mdx-nb-matrix-body { padding: 0.75rem; }
.mdx-nb-diff { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; margin: 0.5rem 0; }
@media (max-width: 720px) { .mdx-nb-diff { grid-template-columns: 1fr; } }
.mdx-nb-diff-side { border: 1px solid var(--border, #e1e4e8); border-radius: 6px; overflow: hidden; }
.mdx-nb-diff-title { padding: 0.4rem 0.75rem; background: var(--bg-soft, #fafbfc); border-bottom: 1px solid var(--border, #e1e4e8); font-weight: 600; font-size: 0.85em; }
.mdx-nb-diff-line { display: block; padding: 0 0.5rem; }
.mdx-nb-diff-common { color: var(--fg-muted, #666); }
.mdx-nb-diff-only-left { background: rgba(207, 34, 46, 0.1); }
.mdx-nb-diff-only-right { background: rgba(45, 164, 78, 0.12); }
.mdx-nb-trace { font-family: var(--font-mono, ui-monospace, monospace); font-size: 0.85em; padding: 0.5rem; border: 1px solid var(--border, #e1e4e8); border-radius: 6px; background: var(--bg, #fff); }
.mdx-nb-trace-row { display: grid; grid-template-columns: minmax(200px, 1fr) 2fr; align-items: center; gap: 0.5rem; padding: 0.2rem 0; }
.mdx-nb-trace-label { display: flex; align-items: center; gap: 0.4rem; }
.mdx-nb-trace-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.mdx-nb-trace-dot-ok { background: #2da44e; }
.mdx-nb-trace-dot-error { background: #cf222e; }
.mdx-nb-trace-duration { color: var(--fg-muted, #666); margin-left: auto; font-size: 0.85em; }
.mdx-nb-trace-track { position: relative; height: 14px; background: var(--bg-soft, #fafbfc); border-radius: 3px; overflow: hidden; }
.mdx-nb-trace-bar { position: absolute; top: 0; bottom: 0; border-radius: 3px; }
.mdx-nb-trace-bar-ok { background: linear-gradient(90deg, #58a6ff, #2da44e); }
.mdx-nb-trace-bar-error { background: linear-gradient(90deg, #cf222e, #e85d5d); }
.mdx-nb-env-badges { display: flex; gap: 0.4rem; flex-wrap: wrap; margin: 0.3rem 0; }
.mdx-nb-env-badge { display: inline-flex; align-items: center; gap: 0.3rem; padding: 0.15rem 0.5rem; border-radius: 99px; font-family: var(--font-mono, monospace); font-size: 0.78em; border: 1px solid var(--border, #e1e4e8); }
.mdx-nb-env-badge-set { background: color-mix(in srgb, #2da44e 15%, transparent); border-color: #2da44e; color: #1a7f37; }
.mdx-nb-env-badge-unset { background: var(--bg-soft, #fafbfc); color: var(--fg-muted, #666); }
.mdx-nb-term { border-bottom: 1px dashed var(--accent, #1f6feb); cursor: help; position: relative; }
.mdx-nb-term-text { color: var(--accent, #1f6feb); }
.mdx-nb-term-tooltip { position: absolute; top: 100%; left: 0; z-index: 10; background: var(--bg, #fff); border: 1px solid var(--border, #e1e4e8); padding: 0.5rem 0.75rem; border-radius: 6px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); min-width: 220px; font-weight: normal; color: var(--fg, #1a1a1a); margin-top: 0.25rem; }
.mdx-nb-ref-link { font-weight: 500; }
.mdx-nb-exercise { padding: 0.75rem; border: 1px solid var(--border, #e1e4e8); border-radius: 6px; margin: 0.75rem 0; background: var(--bg-soft, #fafbfc); }
.mdx-nb-exercise-prompt { margin-bottom: 0.5rem; }
.mdx-nb-exercise textarea { width: 100%; font-family: var(--font-mono, monospace); padding: 0.5rem; border: 1px solid var(--border, #e1e4e8); border-radius: 4px; }
.mdx-nb-exercise-ok { border-color: #2da44e !important; }
.mdx-nb-exercise-wrong { border-color: #cf222e !important; }
.mdx-nb-exercise-controls { display: flex; align-items: center; gap: 0.5rem; margin-top: 0.5rem; }
.mdx-nb-exercise-correct { color: #1a7f37; font-weight: 600; }
.mdx-nb-checklist { padding: 0.75rem; border: 1px solid var(--border, #e1e4e8); border-radius: 6px; margin: 0.75rem 0; }
.mdx-nb-checklist-title { font-weight: 600; margin-bottom: 0.3rem; }
.mdx-nb-checklist ul { list-style: none; padding: 0; margin: 0; }
.mdx-nb-checklist li { padding: 0.15rem 0; }
.mdx-nb-checklist-done { text-decoration: line-through; color: var(--fg-muted, #666); }
.mdx-nb-progress { list-style: none; padding: 0; }
.mdx-nb-progress li { display: flex; align-items: center; gap: 0.4rem; padding: 0.2rem 0; }
.mdx-nb-progress-icon { color: var(--fg-muted, #666); width: 1em; }
.mdx-nb-breakpoint { display: flex; gap: 0.5rem; padding: 0.5rem 0.75rem; background: var(--bg-soft, #fafbfc); border-left: 3px solid var(--accent, #1f6feb); margin: 0.3rem 0; font-size: 0.9em; }
.mdx-nb-breakpoint-line { font-family: var(--font-mono, monospace); font-weight: 600; color: var(--accent, #1f6feb); }
.mdx-nb-tutorial-status { border: 1px solid var(--border, #e1e4e8); border-radius: 8px; padding: 0.8rem; background: var(--bg, #fff); margin: 0.75rem 0; }
.mdx-nb-tutorial-status-title { margin: 0 0 0.5rem; font-size: 0.95rem; }
.mdx-nb-tutorial-meta { margin: 0; display: grid; gap: 0.3rem; }
.mdx-nb-tutorial-meta div { display: grid; grid-template-columns: 120px 1fr; gap: 0.5rem; }
.mdx-nb-tutorial-meta dt { color: var(--fg-muted, #666); }
.mdx-nb-tutorial-meta dd { margin: 0; }
.mdx-nb-checkpoints h4, .mdx-nb-progress-summary h4 { margin: 0.75rem 0 0.4rem; font-size: 0.9rem; }
.mdx-nb-checkpoints ul { margin: 0; padding: 0; list-style: none; }
.mdx-nb-checkpoints li { display: grid; grid-template-columns: 1rem 1fr; gap: 0.5rem; align-items: start; padding: 0.2rem 0; }
.mdx-nb-checkpoint-ok { color: #1a7f37; }
.mdx-nb-checkpoint-fail { color: #b42318; }
.mdx-nb-checkpoint-icon { width: 1rem; text-align: center; }
.mdx-nb-checkpoints small { grid-column: 2; color: var(--fg-muted, #666); }
.mdx-nb-progress-summary p { margin: 0.25rem 0; }
.mdx-nb-progress-blocked { color: #b42318; }
.mdx-nb-progress-ready { color: #1a7f37; }
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
