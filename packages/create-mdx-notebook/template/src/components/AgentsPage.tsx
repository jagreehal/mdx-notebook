import { NotebookPage, AgentTrace, MessageThread, ToolCallTimeline } from "mdx-notebook-react";
import type { Message, ToolCallEntry } from "mdx-notebook-react";
import type { Manifest } from "mdx-notebook-core";

interface AgentResult {
  messages: Message[];
  toolCalls: ToolCallEntry[];
  totalSteps: number;
  mocked?: boolean;
  note?: string;
}

export default function AgentsPage({ manifest }: { manifest: Manifest }) {
  const result = manifest.cells["agent-loop"]?.result as AgentResult | undefined;

  return (
    <NotebookPage manifest={manifest}>
      {result?.mocked && (
        <div className="mdx-nb-callout mdx-nb-callout-warn" style={{ marginBottom: "1rem" }}>
          <div className="mdx-nb-callout-title">Mocked output</div>
          <div>{result.note ?? "Set ANTHROPIC_API_KEY to see a real Claude response here."}</div>
        </div>
      )}
      <h2>Step-by-step trace</h2>
      <AgentTrace cellId="agent-loop" />

      <h2>Conversation thread</h2>
      {result?.messages && <MessageThread messages={result.messages} />}

      <h2>Tool call timeline</h2>
      {result?.toolCalls && <ToolCallTimeline calls={result.toolCalls} />}
    </NotebookPage>
  );
}
