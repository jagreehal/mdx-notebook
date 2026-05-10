import { readFile } from "node:fs/promises";
import { isAbsolute, resolve } from "node:path";
import { parse as parseDotenv } from "dotenv";

export async function mergeEnv(
  base: Record<string, string>,
  envPath: string | undefined,
  cwd: string
): Promise<Record<string, string>> {
  if (!envPath) return { ...base };
  const abs = isAbsolute(envPath) ? envPath : resolve(cwd, envPath);
  const buf = await readFile(abs, "utf8");
  const parsed = parseDotenv(buf);
  return { ...base, ...parsed };
}
