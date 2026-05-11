/**
 * Extract environment variable names referenced from a TypeScript/JavaScript source string.
 *
 * Recognises:
 *   - `process.env.NAME` (dot access)
 *   - `process.env["NAME"]` / `process.env['NAME']` (bracket access)
 *   - `globalThis.process.env.NAME` and similar prefixes
 *
 * Names must match `[A-Z_][A-Z0-9_]*` (env-var convention). Other casings are intentionally
 * ignored to avoid false positives from arbitrary property accesses on unrelated objects.
 */
export function extractEnvRefs(source: string): string[] {
  const found = new Set<string>();
  // dot access: process.env.NAME
  const dotRe = /\bprocess\.env\.([A-Z_][A-Z0-9_]*)/g;
  for (const m of source.matchAll(dotRe)) found.add(m[1]!);
  // bracket access: process.env["NAME"] | process.env['NAME']
  const bracketRe = /\bprocess\.env\[(["'])([A-Z_][A-Z0-9_]*)\1\]/g;
  for (const m of source.matchAll(bracketRe)) found.add(m[2]!);
  return [...found].sort();
}

/**
 * Build a deterministic env-snapshot string for a set of names by joining
 * `name=value` pairs (sorted). Missing or undefined values render as empty strings.
 */
export function envSnapshot(names: string[], env: Record<string, string | undefined>): string {
  if (names.length === 0) return "";
  return names
    .slice()
    .sort()
    .map((name) => `${name}=${env[name] ?? ""}`)
    .join(";");
}
