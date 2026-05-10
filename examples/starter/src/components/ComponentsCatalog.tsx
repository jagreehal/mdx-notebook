import {
  NotebookPage,
  Stdout,
  ResultJSON,
  JsonView,
  JsonEditor,
  AgentTrace,
  IpynbOutputs,
  CodeBlock,
  Math,
  NotebookCell,
  MessageThread,
  ToolCallTimeline,
  TokenStream,
  ModelComparison,
  Plot,
  Predict,
  FillIn,
  StreamingStdout
} from "mdx-notebook-react";
import type { Manifest } from "mdx-notebook-core";
import type { ReactNode } from "react";

function mkManifest(): Manifest {
  const now = Date.now();
  return {
    pageId: "catalog",
    builtAt: now,
    cells: {
      hello: { cellId: "hello", status: "ok", durationMs: 12, exitCode: 0, stdout: [
        { ts: now, stream: "stdout", text: "Hello from a captured cell" },
        { ts: now + 5, stream: "stdout", text: "Two lines, two timestamps" }
      ], stderr: [], result: { greeting: "hi", n: 42 } },
      stream: { cellId: "stream", status: "ok", durationMs: 850, exitCode: 0, stdout: [
        { ts: now,        stream: "stdout", text: "Starting work…" },
        { ts: now + 200,  stream: "stdout", text: "Processing batch 1 of 3" },
        { ts: now + 480,  stream: "stdout", text: "Processing batch 2 of 3" },
        { ts: now + 760,  stream: "stdout", text: "Processing batch 3 of 3" },
        { ts: now + 850,  stream: "stdout", text: "Done." }
      ], stderr: [] },
      ipynb: { cellId: "ipynb", status: "ok", durationMs: 0, exitCode: 0, stdout: [], stderr: [], ipynbOutputs: [
        { type: "stream", name: "stdout", text: "Hello from Jupyter!\n" },
        { type: "execute_result", data: { "text/plain": "42" } }
      ] },
      agent: { cellId: "agent", status: "ok", durationMs: 240, exitCode: 0, stdout: [
        { ts: now, stream: "stdout", text: "--- Step 1 ---" },
        { ts: now + 50, stream: "stdout", text: "Looking up weather" },
        { ts: now + 100, stream: "stdout", text: "--- Step 2 ---" },
        { ts: now + 150, stream: "stdout", text: "Composing response" }
      ], stderr: [], result: { steps: 2, summary: "Mild — pack a jacket." } }
    }
  };
}

const sampleMessages = [
  { role: "user" as const, content: "What's the weather in Tokyo?" },
  { role: "assistant" as const, content: "Let me check.", toolCalls: [{ name: "getWeather", input: { city: "Tokyo" }, output: { temp: 18 }, durationMs: 240 }] },
  { role: "assistant" as const, content: "Tokyo is mild today at 18°C." }
];

const sampleToolCalls = [
  { name: "getWeather", input: { city: "Tokyo" }, output: { temp: 18, condition: "mild" }, durationMs: 240, status: "ok" as const },
  { name: "getForecast", input: { city: "Tokyo", days: 3 }, output: undefined, durationMs: 80, status: "error" as const, error: "rate limited" }
];

const samplePlotData = [
  { day: "Mon", visits: 24 },
  { day: "Tue", visits: 36 },
  { day: "Wed", visits: 52 },
  { day: "Thu", visits: 48 },
  { day: "Fri", visits: 71 }
];

function Section({ title, code, children }: { title: string; code: string; children: ReactNode }) {
  return (
    <section style={{ marginBottom: "2.5rem" }}>
      <h3 style={{ marginTop: 0 }}>{title}</h3>
      <div style={{ border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", overflow: "hidden" }}>
        <div style={{ padding: "1rem 1.25rem", background: "var(--bg)" }}>{children}</div>
        <div style={{ padding: "0.75rem 1.25rem", borderTop: "1px solid var(--border)", background: "var(--bg-soft)", fontFamily: "var(--font-mono)", fontSize: "0.85rem", whiteSpace: "pre-wrap", overflowX: "auto" }}>
          <code>{code}</code>
        </div>
      </div>
    </section>
  );
}

export default function ComponentsCatalog() {
  const manifest = mkManifest();
  return (
    <NotebookPage manifest={manifest}>
      <Section title="<Stdout cellId='hello'>" code={`<Stdout cellId="hello" />`}>
        <Stdout cellId="hello" />
      </Section>
      <Section title="<ResultJSON cellId='hello'>" code={`<ResultJSON cellId="hello" />`}>
        <ResultJSON cellId="hello" />
      </Section>
      <Section title="<JsonView value={…}>" code={`<JsonView value={{ a: 1, b: [2, 3] }} />`}>
        <JsonView value={{ a: 1, b: [2, 3] }} />
      </Section>
      <Section title="<JsonEditor cellId='hello'>" code={`<JsonEditor cellId="hello" />`}>
        <JsonEditor cellId="hello" />
        <ResultJSON cellId="hello" />
      </Section>
      <Section title="<NotebookCell cellId='hello' code='…'>" code={`<NotebookCell cellId="hello" code="console.log('hi');" language="ts" />`}>
        <NotebookCell cellId="hello" code={`console.log('hi');\nexport default () => ({ greeting: 'hi', n: 42 });`} language="ts" />
      </Section>
      <Section title="<AgentTrace cellId='agent'>" code={`<AgentTrace cellId="agent" />`}>
        <AgentTrace cellId="agent" />
      </Section>
      <Section title="<IpynbOutputs cellId='ipynb'>" code={`<IpynbOutputs cellId="ipynb" />`}>
        <IpynbOutputs cellId="ipynb" />
      </Section>
      <Section title="<StreamingStdout cellId='stream'>" code={`<StreamingStdout cellId="stream" speed={0.4} />`}>
        <StreamingStdout cellId="stream" speed={0.4} />
      </Section>
      <Section title="<CodeBlock language='ts' code='…'>" code={`<CodeBlock language="ts" code="const x = 1;" />`}>
        <CodeBlock language="ts" code="const x = 1;" />
      </Section>
      <Section title="<Math expr={…}>" code={`<Math expr="\\\\sum_{i=1}^n x_i" />`}>
        <Math expr={"\\sum_{i=1}^n x_i"} />
      </Section>
      <Section title="<MessageThread messages={…}>" code={`<MessageThread messages={messages} />`}>
        <MessageThread messages={sampleMessages} />
      </Section>
      <Section title="<ToolCallTimeline calls={…}>" code={`<ToolCallTimeline calls={calls} />`}>
        <ToolCallTimeline calls={sampleToolCalls} />
      </Section>
      <Section title="<TokenStream text={…}>" code={`<TokenStream text="Hello, world!" cps={20} />`}>
        <TokenStream text="Hello, world! Streaming output looks like this." cps={20} />
      </Section>
      <Section title="<ModelComparison left={…} right={…}>" code={`<ModelComparison left={{ title: 'fast', content: '…' }} right={{ title: 'careful', content: '…' }} />`}>
        <ModelComparison
          left={{ title: "fast-3.5", content: "Hamlet returns home, sees the ghost, takes revenge — tragedy." }}
          right={{ title: "careful-4", content: "Prince Hamlet, returning to a Denmark mourning his father's death, finds his uncle Claudius on the throne and his mother newly remarried; spurred by his father's ghost, his vengeful design unravels with philosophical doubt and ends in collective ruin." }}
        />
      </Section>
      <Section title="<Plot kind='bar' data={…}>" code={`<Plot kind="bar" data={data} x="day" y="visits" />`}>
        <Plot kind="bar" data={samplePlotData} x="day" y="visits" height={200} />
      </Section>
      <Section title="<Predict expected='42'>" code={`<Predict expected="42">What is 6 × 7?</Predict>`}>
        <Predict expected="42">What is 6 × 7?</Predict>
      </Section>
      <Section title="<FillIn answer='Tokyo'>" code={`<FillIn answer="Tokyo" />`}>
        Capital of Japan: <FillIn answer="Tokyo" />.
      </Section>
    </NotebookPage>
  );
}
