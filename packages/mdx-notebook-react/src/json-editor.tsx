import { useState, useEffect } from "react";
import { useCellOutput, useOutputStore } from "mdx-notebook-core";

export interface JsonEditorProps {
  cellId: string;
  rows?: number;
}

export function JsonEditor({ cellId, rows = 10 }: JsonEditorProps) {
  const out = useCellOutput(cellId);
  const store = useOutputStore();
  const initial = format(out.result);
  const [text, setText] = useState(initial);
  const [valid, setValid] = useState(true);

  // Sync external changes (other consumer of store.setResult) into the editor,
  // but only when the textarea isn't being edited (current text doesn't parse to a different value).
  useEffect(() => {
    const next = format(out.result);
    setText((current) => {
      try {
        const parsed = JSON.parse(current);
        if (deepEqual(parsed, out.result)) return current;
      } catch { /* fallthrough */ }
      return next;
    });
  }, [out.result]);

  return (
    <div className="mdx-nb">
      <textarea
        rows={rows}
        value={text}
        onChange={(e) => {
          const next = e.target.value;
          setText(next);
          try {
            const parsed = JSON.parse(next);
            setValid(true);
            store.setResult(cellId, parsed);
          } catch {
            setValid(false);
          }
        }}
        style={{ width: "100%", fontFamily: "inherit", fontSize: "inherit", padding: "0.5rem" }}
        aria-label={`Edit JSON for ${cellId}`}
      />
      {!valid && <div className="mdx-nb-error" style={{ marginTop: "0.25rem" }}>Invalid JSON</div>}
    </div>
  );
}

function format(value: unknown): string {
  if (value === undefined) return "";
  try { return JSON.stringify(value, null, 2); } catch { return String(value); }
}

function deepEqual(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}
