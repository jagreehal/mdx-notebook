import { createContext, useContext, useState, type ReactNode } from "react";

export interface GlossaryEntry {
  name: string;
  definition: ReactNode;
}

const GlossaryContext = createContext<Record<string, ReactNode>>({});

export function Glossary({ terms, children }: { terms: GlossaryEntry[]; children: ReactNode }) {
  const map = Object.fromEntries(terms.map((t) => [t.name.toLowerCase(), t.definition]));
  return <GlossaryContext.Provider value={map}>{children}</GlossaryContext.Provider>;
}

export function Term({ name, children }: { name?: string; children: ReactNode }) {
  const map = useContext(GlossaryContext);
  const key = (name ?? (typeof children === "string" ? children : "")).toLowerCase();
  const definition = map[key];
  const [open, setOpen] = useState(false);
  if (!definition) {
    return <span>{children}</span>;
  }
  return (
    <span
      className="mdx-nb-term"
      tabIndex={0}
      onClick={() => setOpen(!open)}
      onKeyDown={(e) => { if (e.key === "Enter") setOpen(!open); }}
    >
      <span className="mdx-nb-term-text">{children}</span>
      {open && <span className="mdx-nb-term-tooltip">{definition}</span>}
    </span>
  );
}
