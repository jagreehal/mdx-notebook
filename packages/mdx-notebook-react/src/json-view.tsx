export interface JsonViewProps {
  value: unknown;
  indent?: number;
}

export function JsonView({ value, indent = 2 }: JsonViewProps) {
  return <pre className="mdx-nb"><code>{safeStringify(value, indent)}</code></pre>;
}

function safeStringify(value: unknown, indent: number): string {
  try {
    return JSON.stringify(value, null, indent);
  } catch {
    return String(value);
  }
}
