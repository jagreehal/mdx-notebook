import {
  NotebookPage,
  Stdout,
  ResultJSON,
  MessageThread,
  ToolCallTimeline,
  DiffRuns,
  RefLink,
  TodoChecklist,
  EnvBadge
} from "mdx-notebook-react";
import type { Message, ToolCallEntry } from "mdx-notebook-react";
import type { Manifest } from "mdx-notebook-core";

const ENV_STATUS: Record<string, boolean> =
  (typeof window !== "undefined" && (window as { MDX_NB_ENV_STATUS?: Record<string, boolean> }).MDX_NB_ENV_STATUS) || {};

interface AgentResult {
  prompt: string;
  text: string;
  steps: number;
  toolCalls: ToolCallEntry[];
  mocked?: boolean;
  note?: string;
}

function MockedBanner({ note }: { note: string }) {
  return (
    <div className="mdx-nb-callout mdx-nb-callout-warn" style={{ marginBottom: "0.75rem" }}>
      <div className="mdx-nb-callout-title">Mocked output</div>
      <div>{note}</div>
    </div>
  );
}

function ResultBlock({ result }: { result: AgentResult }) {
  const messages: Message[] = [
    { role: "user", content: result.prompt },
    { role: "assistant", content: result.text }
  ];
  return (
    <>
      {result.mocked && (
        <MockedBanner note={result.note ?? "Set GOOGLE_API_KEY to see real Gemini output."} />
      )}
      <p style={{ color: "var(--fg-muted, #666)", fontSize: "0.92em" }}>
        <strong>Prompt:</strong> {result.prompt}
      </p>
      <MessageThread messages={messages} />
      {result.toolCalls.length > 0 && (
        <>
          <h4 style={{ marginTop: "0.75rem", marginBottom: "0.25rem" }}>Tool calls</h4>
          <ToolCallTimeline calls={result.toolCalls} />
        </>
      )}
    </>
  );
}

export default function BuildAgentPage({ manifest }: { manifest: Manifest }) {
  const step1 = manifest.cells.step1?.result as
    | { tool: string; parameters: Record<string, unknown>; description: string }
    | undefined;
  const step3a = manifest.cells.step3a?.result as AgentResult | undefined;
  const step3b = manifest.cells.step3b?.result as AgentResult | undefined;
  const step5 = manifest.cells.step5?.result as AgentResult | undefined;

  return (
    <NotebookPage manifest={manifest}>
      <section>
        <h2>Required env vars</h2>
        <p>
          This tutorial gracefully falls back to mocked output when the key is unset, so the page always renders.
        </p>
        <EnvBadge vars={["GOOGLE_API_KEY"]} status={ENV_STATUS} />
      </section>

      <section>
        <h2>Step 1 output — tool definition</h2>
        <Stdout cellId="step1" />
        {step1 && <ResultJSON cellId="step1" />}
      </section>

      <section>
        <h2>Step 3 — single-city prompt</h2>
        {step3a ? <ResultBlock result={step3a} /> : <p>(No output captured)</p>}
      </section>

      <section>
        <h2>Step 4 — multi-city prompt (diff vs. step 3)</h2>
        <p style={{ fontSize: "0.92em", color: "var(--fg-muted, #666)" }}>
          Same agent code, broader prompt. The model now invokes <code>getWeather</code> twice. Stdout diff:
        </p>
        <DiffRuns left="step3a" right="step3b" leftLabel="single-city" rightLabel="multi-city" />
        {step3b ? <ResultBlock result={step3b} /> : <p>(No output captured)</p>}
      </section>

      <section>
        <h2>Step 5 — agent picks between tools</h2>
        {step5 ? <ResultBlock result={step5} /> : <p>(No output captured)</p>}
      </section>

      <section>
        <h2>Where to next</h2>
        <ul>
          <li>
            <RefLink href="/tutorials/03-streaming" label="Streaming token output">
              Stream the agent's response
            </RefLink>{" "}
            with `streamText`.
          </li>
          <li>
            <RefLink href="/tutorials/05-crash-resume" label="Crash and resume">
              Use a run matrix
            </RefLink>{" "}
            to try the same prompt across configurations.
          </li>
          <li>
            <RefLink href="/components" label="Component catalog">
              Browse every renderer
            </RefLink>{" "}
            for ideas on what else to capture.
          </li>
        </ul>
      </section>

      <section>
        <h2>Build checklist</h2>
        <TodoChecklist
          storageKey="mdx-notebook:06-build-an-ai-agent"
          items={[
            "Read step 1 — understand tool definitions",
            "Set GOOGLE_API_KEY in .env (optional)",
            "Run a build and verify step 3 captures a real Gemini response",
            "Compare step 3 and step 4 with DiffRuns",
            "Add a third tool to step 5 and rebuild"
          ]}
        />
      </section>
    </NotebookPage>
  );
}
