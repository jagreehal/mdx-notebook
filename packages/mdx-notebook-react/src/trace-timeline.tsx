export interface TraceSpan {
  id: string;
  parentId?: string;
  name: string;
  startNs: number;
  durationNs: number;
  status?: "ok" | "error";
  attributes?: Record<string, string | number | boolean>;
}

export interface TraceTimelineProps {
  spans: TraceSpan[];
  /** Optional total duration override; defaults to max(startNs + durationNs). */
  totalNs?: number;
}

interface Node extends TraceSpan { depth: number; children: Node[]; }

function buildTree(spans: TraceSpan[]): Node[] {
  const byId = new Map<string, Node>();
  for (const s of spans) byId.set(s.id, { ...s, depth: 0, children: [] });
  const roots: Node[] = [];
  for (const s of spans) {
    const node = byId.get(s.id)!;
    if (s.parentId && byId.has(s.parentId)) {
      const parent = byId.get(s.parentId)!;
      node.depth = parent.depth + 1;
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  }
  return roots;
}

function flatten(nodes: Node[], out: Node[] = []): Node[] {
  for (const n of nodes) {
    out.push(n);
    flatten(n.children, out);
  }
  return out;
}

export function TraceTimeline({ spans, totalNs }: TraceTimelineProps) {
  if (spans.length === 0) return null;
  const roots = buildTree(spans);
  const flat = flatten(roots);
  const total = totalNs ?? Math.max(...spans.map((s) => s.startNs + s.durationNs));
  const formatDuration = (ns: number) => ns >= 1_000_000 ? `${(ns / 1_000_000).toFixed(1)}ms` : `${ns}ns`;
  return (
    <div className="mdx-nb mdx-nb-trace">
      {flat.map((s) => {
        const leftPct = total > 0 ? (s.startNs / total) * 100 : 0;
        const widthPct = total > 0 ? Math.max(0.5, (s.durationNs / total) * 100) : 0;
        return (
          <div key={s.id} className="mdx-nb-trace-row" style={{ paddingLeft: `${s.depth * 16}px` }}>
            <div className="mdx-nb-trace-label">
              <span className={`mdx-nb-trace-dot mdx-nb-trace-dot-${s.status ?? "ok"}`}></span>
              {s.name}
              <span className="mdx-nb-trace-duration"> {formatDuration(s.durationNs)}</span>
            </div>
            <div className="mdx-nb-trace-track">
              <div className={`mdx-nb-trace-bar mdx-nb-trace-bar-${s.status ?? "ok"}`} style={{ left: `${leftPct}%`, width: `${widthPct}%` }}></div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
