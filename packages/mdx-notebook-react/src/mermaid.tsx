import { useEffect, useRef, useState } from "react";

export interface MermaidProps {
  chart: string;
  theme?: "default" | "neutral" | "dark";
}

let counter = 0;

export function Mermaid({ chart, theme = "default" }: MermaidProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [id] = useState(() => `mdx-nb-mermaid-${++counter}`);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const mermaid = (await import("mermaid")).default;
        mermaid.initialize({ startOnLoad: false, theme });
        const { svg } = await mermaid.render(id, chart);
        if (!cancelled && ref.current) ref.current.innerHTML = svg;
      } catch (e) {
        if (!cancelled) setError((e as Error).message ?? "Mermaid error");
      }
    })();
    return () => { cancelled = true; };
  }, [chart, theme, id]);

  if (error) return <div className="mdx-nb-error">Mermaid: {error}</div>;
  return <div ref={ref} className="mdx-nb mdx-nb-mermaid" />;
}
