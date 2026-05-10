export interface ToolCall {
  id?: string;
  name: string;
  input?: unknown;
  output?: unknown;
  durationMs?: number;
}
export interface Message {
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  toolCalls?: ToolCall[];
}
export interface MessageThreadProps {
  messages: Message[];
}

export function MessageThread({ messages }: MessageThreadProps) {
  return (
    <div className="mdx-nb mdx-nb-thread">
      {messages.map((m, i) => (
        <div key={i} className={`mdx-nb-msg mdx-nb-msg-${m.role}`}>
          <div className="mdx-nb-msg-role">{m.role}</div>
          <div className="mdx-nb-msg-content">{m.content}</div>
          {m.toolCalls && m.toolCalls.length > 0 && (
            <div className="mdx-nb-msg-tools">
              {m.toolCalls.map((tc, j) => (
                <details key={j} className="mdx-nb-tool">
                  <summary>
                    <code>{tc.name}</code>
                    {typeof tc.durationMs === "number" && (
                      <span className="mdx-nb-tool-latency"> {tc.durationMs}ms</span>
                    )}
                  </summary>
                  {tc.input !== undefined && (
                    <div>
                      <strong>input</strong>
                      <pre><code>{JSON.stringify(tc.input, null, 2)}</code></pre>
                    </div>
                  )}
                  {tc.output !== undefined && (
                    <div>
                      <strong>output</strong>
                      <pre><code>{JSON.stringify(tc.output, null, 2)}</code></pre>
                    </div>
                  )}
                </details>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
