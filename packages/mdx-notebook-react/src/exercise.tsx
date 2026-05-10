import { useState, type ReactNode } from "react";

export interface ExerciseProps {
  prompt: ReactNode;
  answer: string;
  /** Lines that must appear in the answer (substring matches); defaults to exact-whitespace-normalized match. */
  contains?: string[];
  language?: string;
  rows?: number;
}

function normalize(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

export function Exercise({ prompt, answer, contains, language, rows = 6 }: ExerciseProps) {
  const [value, setValue] = useState("");
  const [checked, setChecked] = useState(false);

  const correct = checked && (contains
    ? contains.every((c) => value.includes(c))
    : normalize(value) === normalize(answer));

  return (
    <div className="mdx-nb-exercise">
      <div className="mdx-nb-exercise-prompt">{prompt}</div>
      <textarea
        rows={rows}
        value={value}
        onChange={(e) => { setValue(e.target.value); setChecked(false); }}
        className={checked ? (correct ? "mdx-nb-exercise-ok" : "mdx-nb-exercise-wrong") : ""}
        aria-label="Your answer"
      />
      <div className="mdx-nb-exercise-controls">
        <button type="button" onClick={() => setChecked(true)}>Check</button>
        {checked && correct && <span className="mdx-nb-exercise-correct">Correct</span>}
        {checked && !correct && (
          <details className="mdx-nb-exercise-hint">
            <summary>Show answer</summary>
            <pre><code className={language ? `language-${language}` : undefined}>{answer}</code></pre>
          </details>
        )}
      </div>
    </div>
  );
}
