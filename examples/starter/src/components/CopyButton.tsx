import { useState } from "react";

export interface CopyButtonProps {
  value: string;
}

export default function CopyButton({ value }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      aria-label="Copy command"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          // ignore — older browsers
        }
      }}
      style={{
        padding: "0 0.85rem",
        border: "none",
        borderLeft: "1px solid var(--border)",
        background: copied ? "var(--accent-soft)" : "var(--bg-alt)",
        color: copied ? "var(--accent)" : "var(--fg)",
        cursor: "pointer",
        fontFamily: "inherit",
        fontSize: "0.85rem",
        fontWeight: 500
      }}
    >
      {copied ? "Copied" : "Copy"}
    </button>
  );
}
