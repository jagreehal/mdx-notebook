import { createHash } from "node:crypto";

export function computePageId(relPath: string): string {
  const normalized = relPath.split(/[\\/]+/).join("/");
  return createHash("sha256").update(normalized).digest("hex").slice(0, 16);
}
