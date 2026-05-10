export interface CodeBlockProps {
  code: string;
  language?: string;
}

export function CodeBlock({ code, language }: CodeBlockProps) {
  return (
    <pre className="mdx-nb"><code className={language ? `language-${language}` : undefined}>{code}</code></pre>
  );
}
