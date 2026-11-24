import { readdirSync, readFileSync, statSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";

import { parse as parseYaml } from "yaml";

import { ROOT_DIR } from "./shell.ts";
import { extractCodeBlocks, splitFrontmatter } from "./markdown.ts";
import {
  isPackageManager,
  PACKAGE_MANAGERS,
  type PackageManager,
  TEMPLATE_NAMES,
  templateValues,
} from "./package-managers.ts";
import { expandTemplate, findPlaceholders } from "./template.ts";

export const SCENARIOS_DIR = resolve(ROOT_DIR, "acceptance");
export const SCENARIO_FILE = "scenario.md";

export interface Scenario {
  /** The scenario's directory name, e.g. `node-test-viem`. */
  slug: string;
  /** Absolute path to the scenario.md. */
  scenarioPath: string;
  /** The shell script the scenario runs, placeholders and all. */
  script: string;
  /**
   * The package managers a templated scenario runs under, one cell each.
   * Undefined for a literal scenario, which runs once, as written.
   */
  packageManagers: PackageManager[] | undefined;
}

/** One run of a scenario: the scenario itself, or one cell of its matrix. */
export interface Cell {
  slug: string;
  /** How the cell is reported, e.g. `minimal [pnpm]`. */
  label: string;
  /** Where it runs, relative to the acceptance directory. */
  directory: string;
  packageManager: PackageManager | undefined;
  /** The script with every placeholder expanded. */
  script: string;
}

/** The frontmatter keys a scenario may carry. */
const FRONTMATTER_KEYS = ["packageManager"];

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

/** Read and check one scenario. */
export function loadScenario(scenarioPath: string): Scenario {
  return parseScenario(scenarioPath, readFileSync(scenarioPath, "utf-8"));
}

/**
 * Check one scenario's source.
 *
 * Deliberately strict: exactly one fenced block, carrying a language, holding
 * a script. Multiple blocks and the command/output split arrive in a later
 * phase, and until then an extra block is far more likely to be a mistake than
 * an intention.
 *
 * A scenario is literal or templated, never half: placeholders need a
 * `packageManager` to fill them, and a `packageManager` with no placeholders
 * would run the same commands under every cell.
 */
export function parseScenario(scenarioPath: string, source: string): Scenario {
  const slug = basename(dirname(scenarioPath));

  const { frontmatter, body } = splitFrontmatter(source);
  const packageManagers = parseFrontmatter(frontmatter);
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

  const placeholders = findPlaceholders(block.content);

  for (const { name, line } of placeholders) {
    if (!TEMPLATE_NAMES.includes(name)) {
      throw new Error(
        `Unknown placeholder {{${name}}} on line ${line} of the script; ` +
          `the names are ${TEMPLATE_NAMES.map((n) => `{{${n}}}`).join(", ")}`,
      );
    }
  }

  if (placeholders.length > 0 && packageManagers === undefined) {
    throw new Error(
      `The script uses {{${placeholders[0].name}}} but the frontmatter declares no packageManager to fill it`,
    );
  }

  if (placeholders.length === 0 && packageManagers !== undefined) {
    throw new Error(
      "The frontmatter declares packageManager but the script has no placeholders, " +
        "so every package manager would run the same commands; use {{runRemote}} and {{run}}",
    );
  }

  return { slug, scenarioPath, script: block.content, packageManagers };
}

/**
 * Parse the frontmatter, if there is any, into the package managers it
 * declares. It is the only key there is.
 */
function parseFrontmatter(
  frontmatter: string | undefined,
): PackageManager[] | undefined {
  if (frontmatter === undefined) {
    return undefined;
  }

  let parsed: unknown;

  try {
    parsed = parseYaml(frontmatter);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    throw new Error(`The frontmatter is not valid YAML: ${message}`);
  }

  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("The frontmatter must be a mapping of keys to values");
  }

  for (const key of Object.keys(parsed)) {
    if (!FRONTMATTER_KEYS.includes(key)) {
      throw new Error(
        `Unknown frontmatter key "${key}"; the keys are ${FRONTMATTER_KEYS.join(", ")}`,
      );
    }
  }

  if (!("packageManager" in parsed)) {
    return undefined;
  }

  const value = parsed.packageManager;
  const supported = Object.keys(PACKAGE_MANAGERS).join(", ");

  if (
    !Array.isArray(value) ||
    value.length === 0 ||
    !value.every((item) => typeof item === "string")
  ) {
    throw new Error(
      `packageManager must be a non-empty list, such as [${supported}]`,
    );
  }

  const packageManagers: PackageManager[] = [];

  for (const name of value) {
    if (!isPackageManager(name)) {
      throw new Error(
        `Unsupported package manager "${name}"; the supported ones are ${supported}`,
      );
    }

    if (packageManagers.includes(name)) {
      throw new Error(`packageManager lists "${name}" twice`);
    }

    packageManagers.push(name);
  }

  return packageManagers;
}

/**
 * The runs a scenario expands into: itself, for a literal scenario, or one
 * cell per package manager, each with its placeholders filled in.
 */
export function scenarioCells(scenario: Scenario): Cell[] {
  const { slug, script, packageManagers } = scenario;

  if (packageManagers === undefined) {
    return [
      {
        slug,
        label: slug,
        directory: slug,
        packageManager: undefined,
        script,
      },
    ];
  }

  return packageManagers.map((packageManager) => ({
    slug,
    label: `${slug} [${packageManager}]`,
    directory: join(slug, packageManager),
    packageManager,
    script: expandTemplate(script, templateValues(packageManager)),
  }));
}
