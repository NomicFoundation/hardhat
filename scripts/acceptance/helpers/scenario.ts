import { readdirSync, readFileSync, statSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";

import { ROOT_DIR } from "./shell.ts";
import { extractCodeBlocks, splitFrontmatter } from "./markdown.ts";

export const SCENARIOS_DIR = resolve(ROOT_DIR, "acceptance");
export const SCENARIO_FILE = "scenario.md";

export interface Scenario {
  /** The scenario's directory name, e.g. `node-test-viem`. */
  slug: string;
  /** Absolute path to the scenario.md. */
  scenarioPath: string;
  /** The shell script the scenario runs. */
  script: string;
}

/**
 * List every `acceptance/<slug>/scenario.md`, sorted, so a run is
 * reproducible in order.
 */
export function discoverScenarioPaths(scenariosDir: string): string[] {
  let entries: string[];

  try {
    entries = readdirSync(scenariosDir);
  } catch {
    throw new Error(`No acceptance scenarios directory at ${scenariosDir}`);
  }

  return entries
    .map((entry) => join(scenariosDir, entry, SCENARIO_FILE))
    .filter((path) => {
      try {
        return statSync(path).isFile();
      } catch {
        return false;
      }
    })
    .sort();
}

/**
 * Read and check one scenario.
 *
 * Phase 1 is deliberately strict: exactly one fenced block, carrying a
 * language, holding a script. Multiple blocks and the command/output split
 * arrive in later phases, and until then an extra block is far more likely to
 * be a mistake than an intention.
 */
export function loadScenario(scenarioPath: string): Scenario {
  const slug = basename(dirname(scenarioPath));
  const source = readFileSync(scenarioPath, "utf-8");

  const { body } = splitFrontmatter(source);
  const blocks = extractCodeBlocks(body);

  if (blocks.length === 0) {
    throw new Error("No code block found; a scenario needs a script to run");
  }

  if (blocks.length > 1) {
    throw new Error(
      `Expected exactly one code block, found ${blocks.length} (first extra on line ${blocks[1].line}). ` +
        "Multiple commands per scenario arrive in a later phase.",
    );
  }

  const [block] = blocks;

  if (block.language === undefined) {
    throw new Error(
      `The code block on line ${block.line} has no language; use \`\`\`sh`,
    );
  }

  if (block.content.trim() === "") {
    throw new Error(`The code block on line ${block.line} is empty`);
  }

  return { slug, scenarioPath, script: block.content };
}
