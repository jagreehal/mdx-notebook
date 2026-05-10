// Runs inside the child process via tsx. Imports the user module,
// optionally invokes default export if it's a function, then writes a
// JSON envelope to MDX_NB_RESULT.

import { writeFile } from "node:fs/promises";

const target = process.env.MDX_NB_TARGET;
const resultFile = process.env.MDX_NB_RESULT;

if (!target || !resultFile) {
  process.stderr.write("[mdx-notebook harness] MDX_NB_TARGET and MDX_NB_RESULT are required\n");
  process.exit(2);
}

if (process.env.MDX_NB_DEPS) {
  try {
    globalThis.MDX_NB_DEPS = JSON.parse(process.env.MDX_NB_DEPS);
  } catch {
    // ignore parse failure; users can still read process.env.MDX_NB_DEPS as string
  }
}

const envelope = { ok: true, hasResult: false, result: undefined, error: undefined };

try {
  const mod = await import(target);
  if (mod && typeof mod.default === "function") {
    const value = await mod.default();
    envelope.hasResult = true;
    try {
      JSON.stringify(value);
      envelope.result = value;
    } catch (cause) {
      envelope.ok = false;
      envelope.error = {
        name: "SerializationError",
        message: `default export return value is not JSON-serializable: ${String(cause?.message ?? cause)}`
      };
    }
  }
} catch (err) {
  envelope.ok = false;
  const e = err && typeof err === "object" ? err : { message: String(err) };
  envelope.error = {
    name: e.name ?? "Error",
    message: String(e.message ?? err),
    stack: typeof e.stack === "string" ? e.stack : undefined
  };
}

try {
  await writeFile(resultFile, JSON.stringify(envelope));
} catch (writeErr) {
  process.stderr.write(`[mdx-notebook harness] failed to write result file: ${String(writeErr?.message ?? writeErr)}\n`);
  process.exit(3);
}

if (!envelope.ok) process.exit(1);
