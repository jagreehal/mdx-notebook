import { useState } from "react";

export interface FillInProps {
  answer: string;
  size?: number;
  compare?: (guess: string, expected: string) => boolean;
}

export function FillIn({ answer, size = 12, compare }: FillInProps) {
  const [value, setValue] = useState("");
  const [checked, setChecked] = useState(false);
  const cmp = compare ?? ((a, b) => a.trim() === b.trim());
  const ok = checked && cmp(value, answer);
  return (
    <span className="mdx-nb-fillin">
      <input
        type="text"
        value={value}
        size={size}
        onChange={(e) => { setValue(e.target.value); setChecked(false); }}
        className={checked ? (ok ? "mdx-nb-fillin-ok" : "mdx-nb-fillin-wrong") : undefined}
        aria-label="Fill in the blank"
      />
      <button type="button" onClick={() => setChecked(true)}>?</button>
      {checked && !ok && <span className="mdx-nb-fillin-hint">expected: <code>{answer}</code></span>}
    </span>
  );
}
