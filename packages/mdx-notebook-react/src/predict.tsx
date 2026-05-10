import { useState, type ReactNode } from "react";

export interface PredictProps {
  expected: string;
  /** Children rendered above the input as the question prompt. */
  children?: ReactNode;
  /** Custom comparison; default is trim+lowercase equality. */
  compare?: (guess: string, expected: string) => boolean;
}

export function Predict({ expected, children, compare }: PredictProps) {
  const [guess, setGuess] = useState("");
  const [revealed, setRevealed] = useState(false);
  const cmp = compare ?? ((a, b) => a.trim().toLowerCase() === b.trim().toLowerCase());
  const correct = revealed && cmp(guess, expected);
  return (
    <div className="mdx-nb-predict">
      {children && <div className="mdx-nb-predict-prompt">{children}</div>}
      <input
        className="mdx-nb-predict-input"
        type="text"
        value={guess}
        onChange={(e) => { setGuess(e.target.value); setRevealed(false); }}
        placeholder="Your prediction"
        aria-label="Your prediction"
      />
      <button type="button" className="mdx-nb-predict-btn" onClick={() => setRevealed(true)}>
        Reveal
      </button>
      {revealed && (
        <div className={`mdx-nb-predict-result ${correct ? "mdx-nb-predict-correct" : "mdx-nb-predict-wrong"}`}>
          <strong>{correct ? "Correct" : "Not quite"}</strong>
          <span> — expected: <code>{expected}</code></span>
        </div>
      )}
    </div>
  );
}
