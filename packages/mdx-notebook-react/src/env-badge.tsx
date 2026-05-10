export interface EnvBadgeProps {
  /** Env var names this cell requires. */
  vars: string[];
  /** Pre-computed set map: { VAR_NAME: boolean }. If omitted, all show as unset (no client-side env access). */
  status?: Record<string, boolean>;
}

export function EnvBadge({ vars, status = {} }: EnvBadgeProps) {
  return (
    <div className="mdx-nb-env-badges">
      {vars.map((name) => {
        const isSet = status[name] === true;
        return (
          <span key={name} className={`mdx-nb-env-badge ${isSet ? "mdx-nb-env-badge-set" : "mdx-nb-env-badge-unset"}`}>
            <span className="mdx-nb-env-badge-icon">{isSet ? "✓" : "○"}</span>
            <code>{name}</code>
          </span>
        );
      })}
    </div>
  );
}
