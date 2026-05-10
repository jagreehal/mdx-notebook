import { useState, useEffect } from "react";

export interface TodoChecklistProps {
  items: string[];
  storageKey?: string;
  title?: string;
}

export function TodoChecklist({ items, storageKey, title = "Checklist" }: TodoChecklistProps) {
  const [checked, setChecked] = useState<Set<number>>(() => new Set());

  useEffect(() => {
    if (!storageKey || typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) setChecked(new Set(JSON.parse(raw) as number[]));
    } catch { /* ignore */ }
  }, [storageKey]);

  function toggle(i: number) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i); else next.add(i);
      if (storageKey && typeof window !== "undefined") {
        try { localStorage.setItem(storageKey, JSON.stringify([...next])); } catch { /* ignore */ }
      }
      return next;
    });
  }

  return (
    <div className="mdx-nb-checklist">
      {title && <div className="mdx-nb-checklist-title">{title}</div>}
      <ul>
        {items.map((item, i) => (
          <li key={i}>
            <label>
              <input type="checkbox" checked={checked.has(i)} onChange={() => toggle(i)} />
              <span className={checked.has(i) ? "mdx-nb-checklist-done" : ""}>{item}</span>
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
}
