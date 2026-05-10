import { useEffect, useState } from "react";

export interface TokenStreamProps {
  text: string;
  durationMs?: number;
  cps?: number;          // chars per second; ignored if durationMs is set
  autoStart?: boolean;   // default true
}

export function TokenStream({ text, durationMs, cps = 40, autoStart = true }: TokenStreamProps) {
  const [shown, setShown] = useState(autoStart ? 0 : text.length);
  useEffect(() => {
    if (!autoStart) { setShown(text.length); return; }
    setShown(0);
    if (text.length === 0) return;
    const total = durationMs ?? Math.max(200, (text.length / cps) * 1000);
    const stepMs = Math.max(8, total / text.length);
    let i = 0;
    const id = setInterval(() => {
      i += 1;
      setShown(i);
      if (i >= text.length) clearInterval(id);
    }, stepMs);
    return () => clearInterval(id);
  }, [text, durationMs, cps, autoStart]);
  return <pre className="mdx-nb mdx-nb-stream"><code>{text.slice(0, shown)}</code></pre>;
}
