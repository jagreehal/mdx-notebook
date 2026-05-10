import { useEffect, useState } from "react";

export interface Lesson {
  slug: string;
  title: string;
}

export interface LessonProgressProps {
  lessons: Lesson[];
  storageKey?: string;
  currentSlug?: string;
}

export function LessonProgress({ lessons, storageKey = "mdx-notebook:progress", currentSlug }: LessonProgressProps) {
  const [visited, setVisited] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) setVisited(new Set(JSON.parse(raw) as string[]));
    } catch { /* ignore */ }
    if (currentSlug) {
      setVisited((prev) => {
        if (prev.has(currentSlug)) return prev;
        const next = new Set(prev);
        next.add(currentSlug);
        try { localStorage.setItem(storageKey, JSON.stringify([...next])); } catch { /* ignore */ }
        return next;
      });
    }
  }, [storageKey, currentSlug]);

  return (
    <ul className="mdx-nb-progress">
      {lessons.map((l) => (
        <li key={l.slug}>
          <span className="mdx-nb-progress-icon">{visited.has(l.slug) ? "✓" : "○"}</span>
          <a href={`/tutorials/${l.slug}`}>{l.title}</a>
        </li>
      ))}
    </ul>
  );
}
