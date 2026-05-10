import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";

const STATE_FILE = join(tmpdir(), "mdx-nb-crash-resume.json");
const CRASH_AFTER = process.env.CRASH_AFTER ? Number(process.env.CRASH_AFTER) : 0;
const RESUMING = process.env.RESUMING === "1";
const RESET = process.env.RESET === "1";

interface Step {
  name: string;
  completedAt?: number;
  result?: unknown;
}

interface State { orderId: string; steps: Step[]; }

const FRESH: State = {
  orderId: "order-001",
  steps: [
    { name: "reserveStock" },
    { name: "chargeCard" },
    { name: "sendReceipt" },
    { name: "scheduleShipment" }
  ]
};

function readState(): State {
  if (RESET || !existsSync(STATE_FILE)) return structuredClone(FRESH);
  if (RESUMING) {
    try { return JSON.parse(readFileSync(STATE_FILE, "utf8")) as State; } catch { /* fall through */ }
  }
  return structuredClone(FRESH);
}

function writeState(state: State): void {
  mkdirSync(dirname(STATE_FILE), { recursive: true });
  writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

function maybeCrash(stepIndex: number): void {
  if (CRASH_AFTER > 0 && stepIndex + 1 === CRASH_AFTER) {
    console.log(`[crash] simulating crash after step ${CRASH_AFTER}`);
    process.exit(1);
  }
}

async function runStep(state: State, i: number, body: () => Promise<unknown>): Promise<void> {
  const step = state.steps[i]!;
  if (step.completedAt !== undefined) {
    console.log(`Step ${i + 1}: ${step.name} — replayed from journal (${step.completedAt}ms)`);
    return;
  }
  const t0 = Date.now();
  step.result = await body();
  step.completedAt = Date.now() - t0;
  writeState(state);
  console.log(`Step ${i + 1}: ${step.name} — done in ${step.completedAt}ms`);
}

async function delay(ms: number) { await new Promise((r) => setTimeout(r, ms)); }

const state = readState();
const journalNote = RESUMING && state.steps.some((s) => s.completedAt !== undefined)
  ? ` (resuming from journal — ${state.steps.filter((s) => s.completedAt !== undefined).length} step(s) already done)`
  : "";
console.log(`Order: ${state.orderId}${journalNote}`);

await runStep(state, 0, async () => { await delay(40); return { reservedAt: Date.now() }; });
maybeCrash(0);
await runStep(state, 1, async () => { await delay(40); return { chargedCents: 4999 }; });
maybeCrash(1);
await runStep(state, 2, async () => { await delay(40); return { receiptId: "r-1" }; });
maybeCrash(2);
await runStep(state, 3, async () => { await delay(40); return { shipmentId: "s-1" }; });

console.log(`All ${state.steps.length} steps completed.`);

export default function () {
  return {
    orderId: state.orderId,
    completedSteps: state.steps.filter((s) => s.completedAt !== undefined).length,
    totalSteps: state.steps.length,
    durations: state.steps.map((s) => ({ name: s.name, ms: s.completedAt ?? null }))
  };
}
