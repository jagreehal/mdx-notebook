# Starter Multi-Page Tutorial Site Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure `examples/starter/` into a polished multi-page tutorial site with a sidebar nav, lesson progression, and four real authored tutorials demonstrating mdx-notebook's capabilities.

**Architecture:** The existing single-page Astro starter becomes a multi-page site using a shared `Layout.astro` (header + sidebar) and per-tutorial `.astro` pages that each run `runNotebook` on their corresponding `.mdx` content file and pass the manifest to React island components. New helper scripts in `src/scripts/` provide mock data for the agents, streaming, and model-comparison tutorials. The existing Playwright tests are updated to match the new URL structure and new pages.

**Tech Stack:** Astro 5, React 19, mdx-notebook-astro (`runNotebook`), mdx-notebook-react (all components), TypeScript, Playwright (e2e).

---

## File Map

### Files to CREATE
| Path | Responsibility |
|------|---------------|
| `examples/starter/src/components/Layout.astro` | Shared HTML shell: head, KaTeX CDN, sidebar + main layout grid |
| `examples/starter/src/components/Sidebar.astro` | Hard-coded nav with 4 tutorial links, active-state highlighting |
| `examples/starter/src/components/TutorialPage.tsx` | Generic React island: iterates cell IDs and picks the right component |
| `examples/starter/src/pages/tutorials/01-getting-started.astro` | Tutorial 01 page |
| `examples/starter/src/pages/tutorials/02-agents.astro` | Tutorial 02 page |
| `examples/starter/src/pages/tutorials/03-streaming.astro` | Tutorial 03 page |
| `examples/starter/src/pages/tutorials/04-comparing-models.astro` | Tutorial 04 page |
| `examples/starter/src/content/tutorials/01-getting-started.mdx` | MDX cells for tutorial 01 |
| `examples/starter/src/content/tutorials/02-agents.mdx` | MDX cells for tutorial 02 |
| `examples/starter/src/content/tutorials/03-streaming.mdx` | MDX cells for tutorial 03 |
| `examples/starter/src/content/tutorials/04-comparing-models.mdx` | MDX cells for tutorial 04 |
| `examples/starter/src/scripts/tool-loop.ts` | Mock AI agent tool-loop script for tutorial 02 |
| `examples/starter/src/scripts/stream-tokens.ts` | Timed stdout emitter for tutorial 03 |
| `examples/starter/src/scripts/compare.ts` | Two-model comparison mock for tutorial 04 |

### Files to MODIFY
| Path | What changes |
|------|-------------|
| `examples/starter/src/pages/index.astro` | Replace single-page demo with landing page listing 4 tutorials |
| `tests/starter.story.spec.ts` | Update assertions to match new landing + add agents + streaming tests |
| `tests/hmr.story.spec.ts` | Navigate to `/tutorials/01-getting-started` instead of `/` |

### Files to DELETE
| Path | Reason |
|------|--------|
| `examples/starter/src/components/Page.tsx` | Replaced by per-tutorial pages + TutorialPage.tsx |
| `examples/starter/src/content/callouts-demo.mdx` | Content superseded by tutorials |
| `examples/starter/src/content/tutorial.mdx` | Replaced by per-tutorial MDX files |

### Files to KEEP unchanged
| Path | Note |
|------|------|
| `examples/starter/astro.config.mjs` | Already has mdxNotebook + expressiveCode, no changes needed |
| `examples/starter/package.json` | recharts already included, no new deps |
| `examples/starter/scripts/agent.ts` | Still referenced by tutorial 01's MDX cell |
| `examples/starter/notebooks/intro.ipynb` | Still referenced by tutorial 01's MDX cell |

---

## Task 1: Build workspace packages

**Files:**
- No file changes — just ensures downstream `dist/` outputs are fresh

- [ ] **Step 1: Build all packages tutorial 01 will depend on**

```bash
cd /Users/jreehal/dev/js/r/mdx-notebook
pnpm --filter mdx-notebook-core \
     --filter mdx-notebook-runner-ts \
     --filter mdx-notebook-runner-bash \
     --filter mdx-notebook-react \
     --filter mdx-notebook-astro \
     build
```

Expected: All packages build without errors. You should see `dist/` directories populated inside each package.

---

## Task 2: Create shared Layout.astro

**Files:**
- Create: `examples/starter/src/components/Layout.astro`

- [ ] **Step 1: Create the directory if missing**

```bash
mkdir -p /Users/jreehal/dev/js/r/mdx-notebook/examples/starter/src/components
```

- [ ] **Step 2: Write Layout.astro**

Create `/Users/jreehal/dev/js/r/mdx-notebook/examples/starter/src/components/Layout.astro` with:

```astro
---
import Sidebar from "./Sidebar.astro";
const { title = "mdx-notebook starter" } = Astro.props;
---
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width" />
    <title>{title}</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css" />
    <style>
      :root {
        --sidebar-w: 240px;
        --max-w: 760px;
      }
      body { margin: 0; font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; color: #1a1a1a; }
      .layout { display: grid; grid-template-columns: var(--sidebar-w) 1fr; min-height: 100vh; }
      .sidebar { background: #f6f7f9; border-right: 1px solid #e1e4e8; padding: 1rem; overflow-y: auto; position: sticky; top: 0; height: 100vh; }
      .main { padding: 2rem; max-width: var(--max-w); margin: 0 auto; width: 100%; }
      h1 { font-size: 2rem; margin: 0 0 1rem; }
      h2 { font-size: 1.25rem; margin-top: 2rem; }
      header.top { padding: 0.75rem 1rem; border-bottom: 1px solid #e1e4e8; background: #fff; position: sticky; top: 0; z-index: 5; }
      header.top .brand { font-weight: 700; font-size: 1.05rem; }
      .lesson-nav { display: flex; justify-content: space-between; margin-top: 3rem; padding-top: 1rem; border-top: 1px solid #e1e4e8; }
      .lesson-nav a { color: #1f6feb; text-decoration: none; }
      .mdx-nb-callout {
        border-left: 4px solid #999;
        padding: 0.6rem 0.9rem;
        margin: 0.75rem 0;
        background: #f6f7f9;
        border-radius: 0 6px 6px 0;
      }
      .mdx-nb-callout-title { font-weight: 600; margin-bottom: 0.25rem; }
      .mdx-nb-callout-tip { border-left-color: #2da44e; background: #f1faf3; }
      .mdx-nb-callout-tip .mdx-nb-callout-title { color: #1a7f37; }
      .mdx-nb-callout-info { border-left-color: #1f6feb; background: #f0f6ff; }
      .mdx-nb-callout-info .mdx-nb-callout-title { color: #1f6feb; }
      .mdx-nb-callout-warn { border-left-color: #d4a72c; background: #fff8c5; }
      .mdx-nb-callout-warn .mdx-nb-callout-title { color: #9a6700; }
      .mdx-nb-callout-danger { border-left-color: #cf222e; background: #ffebe9; }
      .mdx-nb-callout-danger .mdx-nb-callout-title { color: #cf222e; }
      .mdx-nb-callout-success { border-left-color: #2da44e; background: #dafbe1; }
      .mdx-nb-callout-success .mdx-nb-callout-title { color: #1a7f37; }
      @media (max-width: 720px) {
        .layout { grid-template-columns: 1fr; }
        .sidebar { position: static; height: auto; border-right: none; border-bottom: 1px solid #e1e4e8; }
      }
    </style>
  </head>
  <body>
    <header class="top"><span class="brand">mdx-notebook</span></header>
    <div class="layout">
      <aside class="sidebar"><Sidebar /></aside>
      <main class="main"><slot /></main>
    </div>
  </body>
</html>
```

Note: The callout CSS is included here so callout classes work on all pages without a separate import.

---

## Task 3: Create Sidebar.astro

**Files:**
- Create: `examples/starter/src/components/Sidebar.astro`

- [ ] **Step 1: Write Sidebar.astro**

Create `/Users/jreehal/dev/js/r/mdx-notebook/examples/starter/src/components/Sidebar.astro` with:

```astro
---
const tutorials = [
  { slug: "01-getting-started", title: "1. Getting started" },
  { slug: "02-agents",          title: "2. AI agents with tool use" },
  { slug: "03-streaming",       title: "3. Streaming token output" },
  { slug: "04-comparing-models", title: "4. Comparing models" }
];
const current = Astro.url.pathname;
---
<nav>
  <h3 style="margin-top: 0; font-size: 0.85rem; text-transform: uppercase; color: #666;">Tutorials</h3>
  <ul style="list-style: none; padding: 0; margin: 0;">
    <li>
      <a href="/" style={`display: block; padding: 0.4rem 0; color: ${current === "/" ? "#1f6feb" : "#1a1a1a"}; text-decoration: none; font-weight: ${current === "/" ? "600" : "normal"};`}>Welcome</a>
    </li>
    {tutorials.map((t) => (
      <li>
        <a
          href={`/tutorials/${t.slug}`}
          style={`display: block; padding: 0.4rem 0; color: ${current.includes(t.slug) ? "#1f6feb" : "#1a1a1a"}; text-decoration: none; font-weight: ${current.includes(t.slug) ? "600" : "normal"};`}
        >{t.title}</a>
      </li>
    ))}
  </ul>
</nav>
```

---

## Task 4: Replace the landing page (index.astro)

**Files:**
- Modify: `examples/starter/src/pages/index.astro` (full replacement)

- [ ] **Step 1: Replace index.astro**

Overwrite `/Users/jreehal/dev/js/r/mdx-notebook/examples/starter/src/pages/index.astro` with:

```astro
---
import Layout from "../components/Layout.astro";
const tutorials = [
  { slug: "01-getting-started", title: "Getting started", blurb: "Three cell forms — inline code, file references, and Jupyter notebooks." },
  { slug: "02-agents",          title: "AI agents with tool use", blurb: "Capture an agent's tool-call timeline and step-by-step reasoning." },
  { slug: "03-streaming",       title: "Streaming token output", blurb: "Replay captured stdout as it would have streamed, live in the browser." },
  { slug: "04-comparing-models", title: "Comparing models", blurb: "Run the same prompt against two configurations and view results side-by-side." }
];
---
<Layout title="mdx-notebook starter">
  <h1>Runnable docs that don't go stale.</h1>
  <p>
    Write MDX. The code runs at build time. Outputs are typed and rendered by React components.
    Viewers can edit the captured data in their browser; components re-render. No server, no notebook server, no kernel.
  </p>
  <h2>Tutorials</h2>
  <ul style="list-style: none; padding: 0;">
    {tutorials.map((t) => (
      <li style="padding: 0.5rem 0; border-bottom: 1px solid #e1e4e8;">
        <a href={`/tutorials/${t.slug}`} style="font-weight: 600; color: #1f6feb; text-decoration: none;">{t.title}</a>
        <div style="color: #555; font-size: 0.95em; margin-top: 0.2rem;">{t.blurb}</div>
      </li>
    ))}
  </ul>
</Layout>
```

---

## Task 5: Create TutorialPage.tsx React island

**Files:**
- Create: `examples/starter/src/components/TutorialPage.tsx`

- [ ] **Step 1: Write TutorialPage.tsx**

Create `/Users/jreehal/dev/js/r/mdx-notebook/examples/starter/src/components/TutorialPage.tsx` with:

```tsx
import { NotebookPage, NotebookCell, IpynbOutputs, AgentTrace } from "mdx-notebook-react";
import type { Manifest } from "mdx-notebook-core";

export interface TutorialPageProps {
  manifest: Manifest;
  /** Render each named cell with the appropriate component. */
  cells: string[];
}

export default function TutorialPage({ manifest, cells }: TutorialPageProps) {
  return (
    <NotebookPage manifest={manifest}>
      {cells.map((id) => {
        const cell = manifest.cells[id];
        if (!cell) return <div key={id} className="mdx-nb-error">No cell with id "{id}"</div>;
        const isIpynb = (cell.ipynbOutputs?.length ?? 0) > 0;
        if (isIpynb) {
          return (
            <section key={id}>
              <h3>Notebook output: {id}</h3>
              <IpynbOutputs cellId={id} />
            </section>
          );
        }
        // Heuristic: if stdout has step markers, treat as agent trace.
        const hasSteps = cell.stdout.some((e) => /^---\s*Step/.test(e.text));
        if (hasSteps) {
          return (
            <section key={id}>
              <h3>Agent trace: {id}</h3>
              <AgentTrace cellId={id} />
            </section>
          );
        }
        return (
          <section key={id}>
            <h3>{id}</h3>
            <NotebookCell cellId={id} />
          </section>
        );
      })}
    </NotebookPage>
  );
}
```

---

## Task 6: Create tutorial 01 MDX content and page

**Files:**
- Create: `examples/starter/src/content/tutorials/01-getting-started.mdx`
- Create: `examples/starter/src/pages/tutorials/01-getting-started.astro`

- [ ] **Step 1: Create directories**

```bash
mkdir -p /Users/jreehal/dev/js/r/mdx-notebook/examples/starter/src/content/tutorials
mkdir -p /Users/jreehal/dev/js/r/mdx-notebook/examples/starter/src/pages/tutorials
```

- [ ] **Step 2: Write the MDX content file**

Create `/Users/jreehal/dev/js/r/mdx-notebook/examples/starter/src/content/tutorials/01-getting-started.mdx` with:

````mdx
# Getting started

Cells in mdx-notebook come in three shapes. Each captures different output.

## Inline code fence

```ts run id=hello
const greeting = "Hello from inline TypeScript";
console.log(greeting);
console.log("Multiple stdout lines are captured");

export default async function () {
  return { greeting, items: [1, 2, 3] };
}
```

The cell above runs at build time. Stdout was captured. The default-export return value became the cell's `result`.

## File reference

This cell points at a real `.ts` file in the repo. The build executes it and captures the output.

:::run{src="../../scripts/agent.ts" id="trace-1"}
:::

## Jupyter notebook import

Saved Python output rendered statically. No Python ever runs at build time — just the captured outputs from the original `.ipynb`.

:::ipynb{src="../../../notebooks/intro.ipynb" id="nb-1" cells="0"}
:::
````

Note on paths: relative paths in MDX `src` attributes are resolved from the MDX file's location. `../../scripts/agent.ts` from `src/content/tutorials/` goes up to `src/` then up to the root, then into `scripts/`. `../../../notebooks/intro.ipynb` goes up 3 levels to the starter root then into `notebooks/`. Verify these match the existing file structure (`scripts/agent.ts` and `notebooks/intro.ipynb` are at the starter root).

The correct relative paths from `src/content/tutorials/`:
- `scripts/agent.ts` is at `examples/starter/scripts/agent.ts` → relative: `../../../scripts/agent.ts`
- `notebooks/intro.ipynb` is at `examples/starter/notebooks/intro.ipynb` → relative: `../../../notebooks/intro.ipynb`

Use these corrected paths:

````mdx
# Getting started

Cells in mdx-notebook come in three shapes. Each captures different output.

## Inline code fence

```ts run id=hello
const greeting = "Hello from inline TypeScript";
console.log(greeting);
console.log("Multiple stdout lines are captured");

export default async function () {
  return { greeting, items: [1, 2, 3] };
}
```

The cell above runs at build time. Stdout was captured. The default-export return value became the cell's `result`.

## File reference

This cell points at a real `.ts` file in the repo. The build executes it and captures the output.

:::run{src="../../../scripts/agent.ts" id="trace-1"}
:::

## Jupyter notebook import

Saved Python output rendered statically. No Python ever runs at build time — just the captured outputs from the original `.ipynb`.

:::ipynb{src="../../../notebooks/intro.ipynb" id="nb-1" cells="0"}
:::
````

- [ ] **Step 3: Write the Astro page**

Create `/Users/jreehal/dev/js/r/mdx-notebook/examples/starter/src/pages/tutorials/01-getting-started.astro` with:

```astro
---
import Layout from "../../components/Layout.astro";
import TutorialPage from "../../components/TutorialPage.tsx";
import { runNotebook } from "mdx-notebook-astro";

const manifest = await runNotebook("./src/content/tutorials/01-getting-started.mdx");
---
<Layout title="Getting started — mdx-notebook">
  <h1>Getting started</h1>
  <p>Three cell forms — inline code, file references, and Jupyter notebooks.</p>

  <TutorialPage manifest={manifest} cells={["hello", "trace-1", "nb-1:0"]} client:load />

  <nav class="lesson-nav">
    <a href="/">← Welcome</a>
    <a href="/tutorials/02-agents">Next: AI agents →</a>
  </nav>
</Layout>
```

---

## Task 7: Create tool-loop.ts script and tutorial 02

**Files:**
- Create: `examples/starter/src/scripts/tool-loop.ts`
- Create: `examples/starter/src/content/tutorials/02-agents.mdx`
- Create: `examples/starter/src/pages/tutorials/02-agents.astro`

- [ ] **Step 1: Create scripts directory**

```bash
mkdir -p /Users/jreehal/dev/js/r/mdx-notebook/examples/starter/src/scripts
```

- [ ] **Step 2: Write tool-loop.ts**

Create `/Users/jreehal/dev/js/r/mdx-notebook/examples/starter/src/scripts/tool-loop.ts` with:

```ts
console.log("--- Step 1 ---");
console.log("User: What's the weather in Tokyo, and what should I pack?");
console.log("Agent: I'll check the weather first.");

console.log("--- Step 2 ---");
console.log("Tool: getWeather({ city: 'Tokyo' })");
console.log("→ { temp: 18, condition: 'mild', humidity: 65 }");

console.log("--- Step 3 ---");
console.log("Agent: Composing response based on weather data.");

const messages = [
  { role: "user" as const, content: "What's the weather in Tokyo, and what should I pack?" },
  {
    role: "assistant" as const,
    content: "Let me check the weather first.",
    toolCalls: [
      { name: "getWeather", input: { city: "Tokyo" }, output: { temp: 18, condition: "mild", humidity: 65 }, durationMs: 240 }
    ]
  },
  { role: "tool" as const, content: '{ "temp": 18, "condition": "mild", "humidity": 65 }' },
  { role: "assistant" as const, content: "Tokyo is mild today at 18°C with 65% humidity. Pack a light jacket — the evenings can be cool. A small umbrella wouldn't hurt either." }
];

const toolCalls = [
  { name: "getWeather", input: { city: "Tokyo" }, output: { temp: 18, condition: "mild", humidity: 65 }, durationMs: 240, status: "ok" as const }
];

export default function () {
  return { messages, toolCalls, totalSteps: 3 };
}
```

- [ ] **Step 3: Write the MDX content file**

Create `/Users/jreehal/dev/js/r/mdx-notebook/examples/starter/src/content/tutorials/02-agents.mdx` with:

````mdx
# AI agents with tool use

When an AI agent calls tools to answer a question, you get a tree of steps: user prompt, tool calls with input/output, and a final response. mdx-notebook captures all of it from a single executable cell.

:::run{src="../../scripts/tool-loop.ts" id="agent-loop"}
:::

The cell above ran a simulated agent loop. Stdout shows step markers; the default-export result contains structured `messages` and `toolCalls` arrays — perfect inputs for `<MessageThread>` and `<ToolCallTimeline>`.
````

Note: relative path from `src/content/tutorials/` to `src/scripts/tool-loop.ts` is `../../scripts/tool-loop.ts`. That resolves correctly.

- [ ] **Step 4: Write the Astro page**

Create `/Users/jreehal/dev/js/r/mdx-notebook/examples/starter/src/pages/tutorials/02-agents.astro` with:

```astro
---
import Layout from "../../components/Layout.astro";
import { runNotebook } from "mdx-notebook-astro";
import { NotebookPage, AgentTrace, MessageThread, ToolCallTimeline } from "mdx-notebook-react";
import type { Message, ToolCallEntry } from "mdx-notebook-react";

const manifest = await runNotebook("./src/content/tutorials/02-agents.mdx");
const result = manifest.cells["agent-loop"]?.result as
  | { messages: Message[]; toolCalls: ToolCallEntry[]; totalSteps: number }
  | undefined;
---
<Layout title="AI agents with tool use — mdx-notebook">
  <h1>AI agents with tool use</h1>
  <p>From a single executable cell, capture the entire agent flow — steps, tool calls, and final response.</p>

  <NotebookPage manifest={manifest} client:load>
    <h2>Step-by-step trace</h2>
    <AgentTrace cellId="agent-loop" />

    <h2>Conversation thread</h2>
    {result?.messages && <MessageThread messages={result.messages} />}

    <h2>Tool call timeline</h2>
    {result?.toolCalls && <ToolCallTimeline calls={result.toolCalls} />}
  </NotebookPage>

  <nav class="lesson-nav">
    <a href="/tutorials/01-getting-started">← Getting started</a>
    <a href="/tutorials/03-streaming">Next: Streaming →</a>
  </nav>
</Layout>
```

---

## Task 8: Create stream-tokens.ts script and tutorial 03

**Files:**
- Create: `examples/starter/src/scripts/stream-tokens.ts`
- Create: `examples/starter/src/content/tutorials/03-streaming.mdx`
- Create: `examples/starter/src/pages/tutorials/03-streaming.astro`

- [ ] **Step 1: Write stream-tokens.ts**

Create `/Users/jreehal/dev/js/r/mdx-notebook/examples/starter/src/scripts/stream-tokens.ts` with:

```ts
async function delay(ms: number) {
  await new Promise((r) => setTimeout(r, ms));
}

const text = `Hello! I'm an AI assistant.

I can help with code, explain concepts, draft text, and more.

For this demo, I'm streaming this response one chunk at a time so you can see how mdx-notebook captures and replays the cadence.

Each line you see was emitted with a small delay — the captured timestamps drive the replay animation in the browser.`;

for (const line of text.split("\n")) {
  console.log(line);
  await delay(120);
}

export default function () {
  return { totalLines: text.split("\n").length };
}
```

- [ ] **Step 2: Write the MDX content file**

Create `/Users/jreehal/dev/js/r/mdx-notebook/examples/starter/src/content/tutorials/03-streaming.mdx` with:

````mdx
# Streaming token output

Long-running cells (like LLM calls or agents) take real time. By default, the page renders the captured output instantly — but `<StreamingStdout>` replays the *original timestamps* so viewers experience the cadence.

:::run{src="../../scripts/stream-tokens.ts" id="stream"}
:::

The cell took roughly 600 ms to run at build time (5 lines × 120 ms delay each). The component below replays that cadence at 2.5× speed.
````

- [ ] **Step 3: Write the Astro page**

Create `/Users/jreehal/dev/js/r/mdx-notebook/examples/starter/src/pages/tutorials/03-streaming.astro` with:

```astro
---
import Layout from "../../components/Layout.astro";
import { runNotebook } from "mdx-notebook-astro";
import { NotebookPage, StreamingStdout, Stdout } from "mdx-notebook-react";

const manifest = await runNotebook("./src/content/tutorials/03-streaming.mdx");
---
<Layout title="Streaming token output — mdx-notebook">
  <h1>Streaming token output</h1>
  <p>Captured stdout, replayed with original timestamps. No actual server-side streaming — pure animation.</p>

  <NotebookPage manifest={manifest} client:load>
    <h2>Replayed stream</h2>
    <StreamingStdout cellId="stream" speed={0.4} />

    <h2>Static rendering (for comparison)</h2>
    <Stdout cellId="stream" />
  </NotebookPage>

  <nav class="lesson-nav">
    <a href="/tutorials/02-agents">← AI agents</a>
    <a href="/tutorials/04-comparing-models">Next: Comparing models →</a>
  </nav>
</Layout>
```

---

## Task 9: Create compare.ts script and tutorial 04

**Files:**
- Create: `examples/starter/src/scripts/compare.ts`
- Create: `examples/starter/src/content/tutorials/04-comparing-models.mdx`
- Create: `examples/starter/src/pages/tutorials/04-comparing-models.astro`

- [ ] **Step 1: Write compare.ts**

Create `/Users/jreehal/dev/js/r/mdx-notebook/examples/starter/src/scripts/compare.ts` with:

```ts
const prompt = "Summarize the plot of Hamlet in two sentences.";

const fast = {
  model: "fast-3.5",
  text: "Hamlet is a Danish prince who, after his father's death and his mother's hasty remarriage to his uncle, is visited by a ghost claiming his uncle is the murderer. The play traces his descent into vengeance, doubt, and tragedy as the court collapses around him.",
  latencyMs: 380,
  tokensOut: 64
};

const careful = {
  model: "careful-4",
  text: "Prince Hamlet returns to Denmark to find his father dead, his mother remarried to his uncle Claudius, and a ghost demanding revenge. Torn between duty, grief, and philosophical doubt, he stages a play to expose the murderer — and the resulting chain of events brings down the entire royal household.",
  latencyMs: 1240,
  tokensOut: 89
};

console.log(`Prompt: ${prompt}`);
console.log(`Comparing two configurations: ${fast.model} vs ${careful.model}`);

export default function () {
  return { prompt, fast, careful };
}
```

- [ ] **Step 2: Write the MDX content file**

Create `/Users/jreehal/dev/js/r/mdx-notebook/examples/starter/src/content/tutorials/04-comparing-models.mdx` with:

````mdx
# Comparing models

Run the same prompt against two configurations and compare results side-by-side.

:::run{src="../../scripts/compare.ts" id="compare"}
:::

The captured `result` has both configurations' outputs. `<ModelComparison>` renders them in a two-column layout that collapses on mobile.
````

- [ ] **Step 3: Write the Astro page**

Create `/Users/jreehal/dev/js/r/mdx-notebook/examples/starter/src/pages/tutorials/04-comparing-models.astro` with:

```astro
---
import Layout from "../../components/Layout.astro";
import { runNotebook } from "mdx-notebook-astro";
import { NotebookPage, ModelComparison } from "mdx-notebook-react";

const manifest = await runNotebook("./src/content/tutorials/04-comparing-models.mdx");
const data = manifest.cells["compare"]?.result as
  | {
      prompt: string;
      fast: { model: string; text: string; latencyMs: number; tokensOut: number };
      careful: { model: string; text: string; latencyMs: number; tokensOut: number };
    }
  | undefined;
---
<Layout title="Comparing models — mdx-notebook">
  <h1>Comparing models</h1>
  {data && <p><strong>Prompt:</strong> <em>{data.prompt}</em></p>}

  <NotebookPage manifest={manifest} client:load>
    {data && (
      <ModelComparison
        left={{
          title: `${data.fast.model} — ${data.fast.latencyMs}ms, ${data.fast.tokensOut} tokens`,
          content: data.fast.text
        }}
        right={{
          title: `${data.careful.model} — ${data.careful.latencyMs}ms, ${data.careful.tokensOut} tokens`,
          content: data.careful.text
        }}
      />
    )}
  </NotebookPage>

  <nav class="lesson-nav">
    <a href="/tutorials/03-streaming">← Streaming</a>
    <a href="/">Done — back to overview</a>
  </nav>
</Layout>
```

---

## Task 10: Delete legacy files

**Files:**
- Delete: `examples/starter/src/components/Page.tsx`
- Delete: `examples/starter/src/content/callouts-demo.mdx`
- Delete: `examples/starter/src/content/tutorial.mdx`

- [ ] **Step 1: Remove legacy files**

```bash
rm /Users/jreehal/dev/js/r/mdx-notebook/examples/starter/src/components/Page.tsx
rm /Users/jreehal/dev/js/r/mdx-notebook/examples/starter/src/content/callouts-demo.mdx
rm /Users/jreehal/dev/js/r/mdx-notebook/examples/starter/src/content/tutorial.mdx
```

---

## Task 11: Build the starter and verify output

**Files:**
- No file changes; verification only

- [ ] **Step 1: Build the starter**

```bash
cd /Users/jreehal/dev/js/r/mdx-notebook
pnpm --filter mdx-notebook-starter build
```

Expected: Build completes with no errors. Check for:
```
dist/index.html                          (landing page)
dist/tutorials/01-getting-started/index.html
dist/tutorials/02-agents/index.html
dist/tutorials/03-streaming/index.html
dist/tutorials/04-comparing-models/index.html
```

- [ ] **Step 2: Verify output files exist**

```bash
ls /Users/jreehal/dev/js/r/mdx-notebook/examples/starter/dist/tutorials/
```

Expected output: four directory names — `01-getting-started`, `02-agents`, `03-streaming`, `04-comparing-models`.

If the build fails, common fixes:
- "Cannot find module" → ensure `pnpm install` ran from the monorepo root after any package.json change
- Path resolution errors in MDX `src=` attributes → recheck relative paths from `src/content/tutorials/`
- TypeScript errors in `.astro` → fix the type cast in the Astro frontmatter

---

## Task 12: Update Playwright tests

**Files:**
- Modify: `tests/starter.story.spec.ts` (full replacement)
- Modify: `tests/hmr.story.spec.ts` (update one `goto` call and one `getByText` assertion)

- [ ] **Step 1: Replace starter.story.spec.ts**

Overwrite `/Users/jreehal/dev/js/r/mdx-notebook/tests/starter.story.spec.ts` with:

```ts
import { expect, test } from "@playwright/test";
import { story } from "executable-stories-playwright";

test("Landing page lists all 4 tutorials", async ({ page }, testInfo) => {
  story.init(testInfo, { tags: ["starter", "e2e"] });
  story.given("the starter Astro app is running on localhost:4321");

  story.when("the homepage is loaded");
  await page.goto("/");
  await page.waitForLoadState("networkidle");

  story.then("the landing page headline is visible");
  await expect(page.getByText(/Runnable docs that don't go stale/)).toBeVisible();

  story.then("all 4 tutorial links are present");
  await expect(page.getByRole("link", { name: /Getting started/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /AI agents with tool use/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Streaming token output/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Comparing models/ })).toBeVisible();

  story.then("the sidebar shows tutorial navigation");
  await expect(page.getByRole("navigation")).toBeVisible();
});

test("Tutorial 02: agents page renders MessageThread and ToolCallTimeline", async ({ page }, testInfo) => {
  story.init(testInfo, { tags: ["starter", "e2e"] });
  story.given("the starter Astro app is running on localhost:4321");

  story.when("the agents tutorial page is loaded");
  await page.goto("/tutorials/02-agents");
  await page.waitForLoadState("networkidle");

  story.then("the page heading is visible");
  await expect(page.getByRole("heading", { name: /AI agents with tool use/ })).toBeVisible();

  story.then("the agent stdout steps are rendered");
  await expect(page.getByText(/Step 1/).first()).toBeVisible();

  story.then("the MessageThread shows conversation roles");
  await expect(page.getByText(/user/).first()).toBeVisible();
  await expect(page.getByText(/assistant/).first()).toBeVisible();

  story.then("the ToolCallTimeline lists the getWeather call");
  await expect(page.getByText(/getWeather/).first()).toBeVisible();

  story.then("the lesson nav links are present");
  await expect(page.getByRole("link", { name: /Getting started/ }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: /Streaming/ }).first()).toBeVisible();
});

test("Tutorial 03: streaming page renders StreamingStdout", async ({ page }, testInfo) => {
  story.init(testInfo, { tags: ["starter", "e2e"] });
  story.given("the starter Astro app is running on localhost:4321");

  story.when("the streaming tutorial page is loaded");
  await page.goto("/tutorials/03-streaming");
  await page.waitForLoadState("networkidle");

  story.then("the page heading is visible");
  await expect(page.getByRole("heading", { name: /Streaming token output/ })).toBeVisible();

  story.then("the streaming output container is present");
  await expect(page.locator(".mdx-nb-streaming").first()).toBeVisible();

  story.then("the static stdout comparison is also present");
  await expect(page.getByText(/Static rendering/).first()).toBeVisible();

  story.then("the lesson nav links are present");
  await expect(page.getByRole("link", { name: /AI agents/ }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: /Comparing models/ }).first()).toBeVisible();
});
```

- [ ] **Step 2: Update hmr.story.spec.ts**

In `/Users/jreehal/dev/js/r/mdx-notebook/tests/hmr.story.spec.ts`:

Change the `page.goto("/")` call to navigate to the tutorial page that references `agent.ts`:
```ts
await page.goto("/tutorials/01-getting-started");
```

Change the first `expect` assertion to check for agent output that appears on that page. The `scripts/agent.ts` file contains:
```
"Pack a light jacket — Tokyo is mild today."
```
This is still the sentinel string — it remains correct. Only the `goto` URL changes.

The full updated file:

```ts
import { expect, test } from "@playwright/test";
import { story } from "executable-stories-playwright";
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const STARTER = join(__dirname, "..", "examples", "starter");
const AGENT = join(STARTER, "scripts", "agent.ts");

test("editing agent.ts triggers a reload and updates the rendered output", async ({ page }, testInfo) => {
  story.init(testInfo, { tags: ["hmr"] });
  story.given("the starter dev server is up and the tutorial 01 page is loaded with the original agent output");

  const original = await readFile(AGENT, "utf8");
  await page.goto("/tutorials/01-getting-started");
  await page.waitForLoadState("networkidle");
  await expect(page.getByText(/Pack a light jacket/).first()).toBeVisible();

  story.when("agent.ts is rewritten with a new finalResponse and saved");
  const edited = original.replace(
    "Pack a light jacket — Tokyo is mild today.",
    "HMR sentinel string from the test"
  );
  await writeFile(AGENT, edited, "utf8");

  try {
    story.then("the page reloads and the new output is rendered");
    await page.waitForLoadState("networkidle", { timeout: 30_000 });
    await expect(page.getByText(/HMR sentinel string from the test/).first()).toBeVisible({ timeout: 30_000 });
  } finally {
    await writeFile(AGENT, original, "utf8");
  }
});
```

---

## Task 13: Run the e2e tests

**Files:**
- No file changes; verification only

- [ ] **Step 1: Make sure nothing is running on port 4321**

```bash
lsof -ti:4321 | xargs kill -9 2>/dev/null; echo "cleared"
```

- [ ] **Step 2: Run the Playwright tests against the dev server**

```bash
cd /Users/jreehal/dev/js/r/mdx-notebook
pnpm test:e2e
```

Expected: All 4 tests pass (3 starter tests + 1 HMR test). The HMR test requires the dev server to be running; check `playwright.config.ts` for how the dev server is launched.

If a test fails, check:
- **Landing page test:** Did the landing page headline render? Check `index.astro` content.
- **Agents test:** Did `MessageThread` or `ToolCallTimeline` fail? Inspect whether `manifest.cells["agent-loop"]?.result` is populated — check the MDX src path resolves.
- **Streaming test:** `.mdx-nb-streaming` not found — verify `StreamingStdout` is imported and the cell id `"stream"` matches the MDX `id=stream`.
- **HMR test:** If nav fails, verify `agent.ts` is still referenced in `01-getting-started.mdx` via the `:::run` directive.

---

## Task 14: Commit

**Files:**
- No file changes; git commit only

- [ ] **Step 1: Stage all changes**

```bash
cd /Users/jreehal/dev/js/r/mdx-notebook
git add \
  examples/starter/src/components/Layout.astro \
  examples/starter/src/components/Sidebar.astro \
  examples/starter/src/components/TutorialPage.tsx \
  examples/starter/src/pages/index.astro \
  examples/starter/src/pages/tutorials/01-getting-started.astro \
  examples/starter/src/pages/tutorials/02-agents.astro \
  examples/starter/src/pages/tutorials/03-streaming.astro \
  examples/starter/src/pages/tutorials/04-comparing-models.astro \
  examples/starter/src/content/tutorials/01-getting-started.mdx \
  examples/starter/src/content/tutorials/02-agents.mdx \
  examples/starter/src/content/tutorials/03-streaming.mdx \
  examples/starter/src/content/tutorials/04-comparing-models.mdx \
  examples/starter/src/scripts/tool-loop.ts \
  examples/starter/src/scripts/stream-tokens.ts \
  examples/starter/src/scripts/compare.ts \
  tests/starter.story.spec.ts \
  tests/hmr.story.spec.ts
git add -u examples/starter/src/components/Page.tsx \
           examples/starter/src/content/callouts-demo.mdx \
           examples/starter/src/content/tutorial.mdx
```

- [ ] **Step 2: Commit**

```bash
git commit -m "$(cat <<'EOF'
feat(starter): multi-page tutorial site with 4 authored tutorials

Replaces the single-page starter demo with a full multi-page Astro site:
Layout + Sidebar shared shell, landing page, and four tutorials covering
inline cells, agent tool loops, streaming stdout replay, and model comparison.
EOF
)"
```

---

## Self-Review Checklist

**Spec coverage:**
- Layout.astro with header + sidebar + slot — Task 2
- Sidebar.astro with 4 tutorial links + active state — Task 3
- Landing page (index.astro) with tutorial list — Task 4
- TutorialPage.tsx generic React island — Task 5
- Tutorial 01: inline + file ref + ipynb — Task 6
- Tutorial 02: tool-loop.ts + MDX + agents page — Task 7
- Tutorial 03: stream-tokens.ts + MDX + streaming page — Task 8
- Tutorial 04: compare.ts + MDX + comparison page — Task 9
- Delete Page.tsx, callouts-demo.mdx, tutorial.mdx — Task 10
- Build verification — Task 11
- Updated starter.story.spec.ts (3 new tests) — Task 12
- Updated hmr.story.spec.ts (goto URL change only) — Task 12
- Commit — Task 14

**Placeholder scan:** All steps contain concrete code. No TODOs or "implement later" statements.

**Type consistency:**
- `Message` and `ToolCallEntry` are imported from `mdx-notebook-react` in tutorial 02 page — consistent with what the package exports.
- `ComparisonSide` shape used in tutorial 04 matches the `ModelComparison` component props.
- `Manifest` type used in `TutorialPage.tsx` imported from `mdx-notebook-core` — consistent with `runNotebook` return type.
- `cell.ipynbOutputs` and `cell.stdout` field access in TutorialPage.tsx — verify these field names against `mdx-notebook-core`'s `CellOutput` type before committing.

**Path verification note:** The MDX `src=` relative paths resolve from the MDX file's directory. From `src/content/tutorials/`:
- `../../scripts/tool-loop.ts` → `src/scripts/tool-loop.ts` ✓ (new location)
- `../../scripts/stream-tokens.ts` → `src/scripts/stream-tokens.ts` ✓
- `../../scripts/compare.ts` → `src/scripts/compare.ts` ✓
- `../../../scripts/agent.ts` → root `scripts/agent.ts` ✓ (existing file, unchanged location)
- `../../../notebooks/intro.ipynb` → root `notebooks/intro.ipynb` ✓

**IpynbOutputs cell id:** The tutorial page passes `"nb-1:0"` to `TutorialPage`, but the MDX declares `id="nb-1"`. The `IpynbOutputs` component uses `cellId` as `nb-1` and the `:0` suffix typically selects the first cell's output. Verify this is the correct id format by checking how `IpynbOutputs` uses `cellId` in its source — if it expects just `"nb-1"` and handles cell selection internally, change `cells={["hello", "trace-1", "nb-1:0"]}` to `cells={["hello", "trace-1", "nb-1"]}`.
