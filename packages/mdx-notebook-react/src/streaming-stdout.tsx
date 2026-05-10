import { useEffect, useRef, useState } from "react";
import { useCellOutput } from "mdx-notebook-core/runtime/react";

export interface StreamingStdoutProps {
  cellId: string;
  /**
   * Time scaling factor for replay. 1.0 = real-time (use the recorded gaps between events);
   * < 1 = faster (e.g., 0.25 = 4x speed); > 1 = slower. Default 0.4 (2.5x faster).
   */
  speed?: number;
  /** Maximum total replay duration in ms; events compress to fit if recorded duration exceeds it. Default 8000. */
  maxDurationMs?: number;
  /** If false, render full output immediately (no animation). Default true. */
  animate?: boolean;
  /** Replay each line individually instead of all at once. Default true. */
  replay?: boolean;
}

export function StreamingStdout({
  cellId,
  speed = 0.4,
  maxDurationMs = 8000,
  animate = true,
  replay = true
}: StreamingStdoutProps) {
  const out = useCellOutput(cellId);
  const events = out.stdout;
  const [shownCount, setShownCount] = useState(animate && events.length > 0 ? 0 : events.length);
  const cancelRef = useRef<number | null>(null);

  useEffect(() => {
    if (!animate || events.length === 0) {
      setShownCount(events.length);
      return;
    }
    setShownCount(0);
    if (!replay) {
      const id = window.setTimeout(() => setShownCount(events.length), 50);
      cancelRef.current = id as unknown as number;
      return () => window.clearTimeout(id);
    }
    // Compute scaled gaps between events
    const first = events[0]!.ts;
    const last = events[events.length - 1]!.ts;
    const recordedSpan = Math.max(0, last - first);
    const targetSpan = Math.min(maxDurationMs, recordedSpan * speed);
    const scale = recordedSpan === 0 ? 0 : targetSpan / recordedSpan;
    const cumulative: number[] = events.map((e) => Math.max(50, (e.ts - first) * scale));
    const timers: number[] = [];
    cumulative.forEach((delay, i) => {
      const id = window.setTimeout(() => setShownCount(i + 1), delay + i * 8);
      timers.push(id as unknown as number);
    });
    return () => { timers.forEach((id) => window.clearTimeout(id)); };
  }, [events, animate, speed, maxDurationMs, replay]);

  if (events.length === 0) return null;

  const slice = events.slice(0, shownCount);
  const animating = animate && shownCount < events.length;
  return (
    <pre className={`mdx-nb mdx-nb-streaming ${animating ? "mdx-nb-streaming-active" : ""}`}>
      <code>
        {slice.map((e, i) => (
          <span key={i} className={`mdx-nb-line mdx-nb-line-${e.stream}`}>
            {e.text}
            {"\n"}
          </span>
        ))}
        {animating && <span className="mdx-nb-streaming-caret" aria-hidden="true">▌</span>}
      </code>
    </pre>
  );
}
