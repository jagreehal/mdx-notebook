import { NotebookPage, AgentTrace, MessageThread, ToolCallTimeline } from "mdx-notebook-react";
import type { Message, ToolCallEntry } from "mdx-notebook-react";
import type { Manifest } from "mdx-notebook-core";

export default function AgentsPage({ manifest }: { manifest: Manifest }) {
  const result = manifest.cells["agent-loop"]?.result as
    | { messages: Message[]; toolCalls: ToolCallEntry[]; totalSteps: number }
    | undefined;

  return (
    <NotebookPage manifest={manifest}>
      <h2>Step-by-step trace</h2>
      <AgentTrace cellId="agent-loop" />

      <h2>Conversation thread</h2>
      {result?.messages && <MessageThread messages={result.messages} />}

      <h2>Tool call timeline</h2>
      {result?.toolCalls && <ToolCallTimeline calls={result.toolCalls} />}
    </NotebookPage>
  );
}
