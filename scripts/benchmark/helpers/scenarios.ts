import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import { isScenarioDefinition } from "../../end-to-end/schema/scenario-schema.ts";

const END_TO_END_DIR = path.resolve(
  import.meta.dirname,
  "..",
  "..",
  "..",
  "end-to-end",
);

/**
 * Scenario.json paths for every scenario under end-to-end/ that carries `tag`,
 * is not disabled, and does not opt out via benchmark.skip — the same set
 * bench:regression selects with --tag. Used by the post-benchmark measurement
 * scripts (bytecode-size, dump-standard-json) to cover every scenario the
 * timing run just initialized. Throws on an invalid scenario.json rather than
 * silently skipping a scenario.
 */
export function discoverScenarioPathsByTag(tag: string): string[] {
  const paths: string[] = [];

  for (const entry of readdirSync(END_TO_END_DIR, { withFileTypes: true })) {
    if (!entry.isDirectory()) {
      continue;
    }

    const scenarioJsonPath = path.join(
      END_TO_END_DIR,
      entry.name,
      "scenario.json",
    );

    let raw: string;

    try {
      raw = readFileSync(scenarioJsonPath, "utf-8");
    } catch {
      continue;
    }

    const parsed: unknown = JSON.parse(raw);

    if (!isScenarioDefinition(parsed)) {
      throw new Error(`Invalid scenario.json at ${scenarioJsonPath}`);
    }

    if (
      parsed.tags.includes(tag) &&
      parsed.disabled !== true &&
      parsed.benchmark?.skip !== true
    ) {
      paths.push(scenarioJsonPath);
    }
  }

  return paths;
}
