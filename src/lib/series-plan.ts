import "server-only";
import { readFileSync } from "fs";
import path from "path";

let cached: string | null = null;

/** Reads content/series-plan.md once per server instance. */
export function getSeriesPlan(): string {
  if (cached === null) {
    const file = path.join(process.cwd(), "content", "series-plan.md");
    cached = readFileSync(file, "utf8");
  }
  return cached;
}
