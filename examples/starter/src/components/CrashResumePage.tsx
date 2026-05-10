import {
  NotebookPage,
  RunMatrix,
  DiffRuns,
  CodeDiff,
  TraceTimeline,
  EnvBadge,
  Glossary,
  Term,
  Exercise,
  TodoChecklist,
  LessonProgress,
  Breakpoint,
  RefLink
} from "mdx-notebook-react";
import type { Manifest } from "mdx-notebook-core";
import type { TraceSpan } from "mdx-notebook-react";
import { getLessonsByGroup } from "../tutorials.config.ts";

const ENV_STATUS: Record<string, boolean> = (typeof window !== "undefined" && (window as { MDX_NB_ENV_STATUS?: Record<string, boolean> }).MDX_NB_ENV_STATUS) || {};

const beforeCode = `// Naive — no journal
async function processOrder() {
  await reserveStock();
  await chargeCard();
  await sendReceipt();
  await scheduleShipment();
}`;

const afterCode = `// Durable — journal each step
async function processOrder(state) {
  await runStep(state, 0, reserveStock);
  await runStep(state, 1, chargeCard);
  await runStep(state, 2, sendReceipt);
  await runStep(state, 3, scheduleShipment);
}`;

const flatLessons = getLessonsByGroup().flatMap((g) => g.lessons);

const sampleSpans: TraceSpan[] = [
  { id: "1", name: "processOrder", startNs: 0, durationNs: 240_000_000, status: "ok" },
  { id: "2", parentId: "1", name: "reserveStock", startNs: 5_000_000, durationNs: 50_000_000, status: "ok" },
  { id: "3", parentId: "1", name: "chargeCard", startNs: 60_000_000, durationNs: 80_000_000, status: "ok" },
  { id: "4", parentId: "1", name: "sendReceipt", startNs: 145_000_000, durationNs: 45_000_000, status: "ok" },
  { id: "5", parentId: "1", name: "scheduleShipment", startNs: 195_000_000, durationNs: 40_000_000, status: "ok" }
];

export default function CrashResumePage({ manifest }: { manifest: Manifest }) {
  return (
    <NotebookPage manifest={manifest}>
      <Glossary terms={[
        { name: "journal", definition: "A persistent record of completed steps. On restart, completed steps are skipped instead of re-run." },
        { name: "idempotent", definition: "An operation that produces the same result regardless of how many times it runs." },
        { name: "durability", definition: "The property that an operation, once acknowledged, survives crashes." }
      ]}>
        <section>
          <h2>What the script does</h2>
          <p>
            A four-step order pipeline. Each step takes ~40ms and writes its result to a <Term name="journal">journal</Term> file
            in <code>/tmp</code>. Crashing mid-flight loses the in-memory state but the journal persists, so a <Term name="durability">durable</Term> rerun can skip steps already completed.
          </p>
          <EnvBadge vars={["CRASH_AFTER", "RESUMING", "RESET"]} status={ENV_STATUS} />
        </section>

        <section>
          <h2>Three runs in one cell</h2>
          <RunMatrix cellId="run" />
        </section>

        <section>
          <h2>Diff the crash run vs. the resume run</h2>
          <p>
            Lines unique to one side are highlighted. Notice the "replayed from journal" lines in <strong>resume</strong> that
            don't appear in <strong>crash</strong> — that's the entire mental model.
          </p>
          <DiffRuns left="run" right="run" leftVariant="crash" rightVariant="resume" leftLabel="crash" rightLabel="resume" />
        </section>

        <section>
          <h2>Naive vs. durable code</h2>
          <p>The change is small. Wrap each step in a <Term name="journal">journal</Term>-aware helper:</p>
          <CodeDiff before={beforeCode} after={afterCode} language="ts" leftLabel="naive" rightLabel="durable" />
          <Breakpoint line={3}>
            This is the key line — <code>runStep(state, 0, reserveStock)</code> checks the journal before doing any work.
            If step 0 already completed, it logs "replayed from journal" and returns immediately.
          </Breakpoint>
        </section>

        <section>
          <h2>Anatomy of a workflow trace</h2>
          <p>Run a real OpenTelemetry-instrumented version of this and the trace looks like the timeline below — one root span with four child spans.</p>
          <TraceTimeline spans={sampleSpans} />
        </section>

        <section>
          <h2>Try it yourself</h2>
          <p>Write a <code>runStep</code> helper that skips a step if its result already exists in the journal. The body should:</p>
          <ol>
            <li>Look up <code>state.steps[i].completedAt</code></li>
            <li>If defined, log "replayed from journal" and return</li>
            <li>Otherwise, run the body and record the duration</li>
          </ol>
          <Exercise
            language="ts"
            prompt="Fill in the runStep body."
            contains={["state.steps[i]", "completedAt", "await body()", "writeState"]}
            answer={`async function runStep(state, i, body) {
  const step = state.steps[i];
  if (step.completedAt !== undefined) {
    console.log("Step", i + 1, ": replayed from journal");
    return;
  }
  const t0 = Date.now();
  step.result = await body();
  step.completedAt = Date.now() - t0;
  writeState(state);
}`}
          />
        </section>

        <section>
          <h2>Where to next</h2>
          <p>
            Now that you've seen crash/resume in action, see how cells share data without state files:
            {' '}<RefLink href="/tutorials/02-agents" label="AI agents with tool use" />.
          </p>
        </section>

        <section>
          <h2>Checklist</h2>
          <TodoChecklist
            storageKey="mdx-notebook:05-crash-resume"
            items={[
              "Read the three-run matrix output",
              "Compare crash vs. resume with DiffRuns",
              "Read the naive-vs-durable code diff",
              "Complete the runStep exercise",
              "Try changing CRASH_AFTER and rebuilding"
            ]}
          />
        </section>

        <section>
          <h2>Your progress</h2>
          <LessonProgress lessons={flatLessons.map((l) => ({ slug: l.slug, title: l.title }))} currentSlug="05-crash-resume" />
        </section>
      </Glossary>
    </NotebookPage>
  );
}
