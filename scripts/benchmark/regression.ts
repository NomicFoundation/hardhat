import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { runBenchmark } from "./main.ts";
import type { BenchArgs } from "./helpers/args.ts";
import { DEFAULT_CLONE_DIR } from "../end-to-end/helpers/args.ts";
import { fmt, log, logError, logStep, logWarning } from "./helpers/log.ts";
import {
  ForceCheckout,
  ForcePublish,
  UseLocal,
  init as e2eInit,
} from "../end-to-end/subcommands/init.ts";

const USAGE = `
scripts/benchmark/regression.ts — Multi-scenario regression benchmark

DESCRIPTION
  For each scenario under end-to-end/ that is not disabled and does not opt
  out via "benchmark": { "skip": true }, runs three hyperfine phases:

    1. Cold compile  — "npx hardhat compile" with the compile cache cleared
                       before each run (via --prepare "npx hardhat clean").
    2. Warm compile  — "npx hardhat compile" against the warm cache.
    3. Default cmd   — the scenario's defaultCommand, against a compiled
                       project.

  Run counts (N, M, L) are required per scenario in scenario.json under
  "benchmark": { "runs": { "coldCompile": N, "warmCompile": M,
                            "defaultCommand": L } }.
  Missing fields fail pre-flight with a summary of every offending scenario.

  Writes a flat JSON array in benchmark-action/github-action-benchmark's
  customSmallerIsBetter format. Per-run times are preserved in the "extra"
  field as a JSON-stringified object.

OPTIONS
  --output <path>       Required. Aggregated JSON destination
  --scenarios <csv>     Filter by scenario id (directory basename)
  --tag <tag>           Filter by a tag present in scenario.json tags
  --use-local           Forwarded to the per-scenario init step
  --force-checkout      Forwarded to the per-scenario init step
  --force-publish       Forwarded to the per-scenario init step
  --e2e-clone-dir <p>   Override clone directory (default: same as pnpm e2e)
  --fail-fast           Abort on the first scenario failure

EXAMPLES
  pnpm bench:regression --output /tmp/regression.json
  pnpm bench:regression --scenarios uniswap-v4-core,aave-v4 --output /tmp/r.json
`;

const REPO_ROOT = path.resolve(import.meta.dirname, "..", "..");
const END_TO_END_DIR = path.join(REPO_ROOT, "end-to-end");

interface RegressionArgs {
  output: string;
  scenarios: string[] | undefined;
  tag: string | undefined;
  useLocal: UseLocal;
  forceCheckout: ForceCheckout;
  forcePublish: ForcePublish;
  e2eCloneDirectory: string;
  failFast: boolean;
}

interface ScenarioEntry {
  id: string;
  scenarioJsonPath: string;
  definition: ScenarioDefinitionLike;
}

interface ScenarioDefinitionLike {
  defaultCommand?: string;
  tags?: string[];
  disabled?: boolean;
  benchmark?: {
    skip?: boolean;
    runs?: {
      defaultCommand?: number;
      coldCompile?: number;
      warmCompile?: number;
    };
  };
}

interface BenchmarkEntry {
  name: string;
  unit: string;
  value: number;
  range: string;
  extra: string;
}

interface HyperfineResult {
  mean: number;
  stddev: number;
  min: number;
  max: number;
  median: number;
  times: number[];
}

async function main(): Promise<void> {
  const args = resolveArgs(process.argv.slice(2));

  if (args === undefined) {
    console.log(USAGE);
    return;
  }

  const scenarios = collectScenarios(args);

  if (scenarios.length === 0) {
    logError("No scenarios matched the provided filters");
    process.exit(1);
  }

  const missing = findMissingRunCounts(scenarios);

  if (missing.length > 0) {
    printMissingRunCountsError(missing);
    process.exit(1);
  }

  const results: BenchmarkEntry[] = [];
  const failures: string[] = [];

  for (const scenario of scenarios) {
    logStep(`Scenario: ${fmt.pkg(scenario.id)}`);

    try {
      const entries = await runScenario(scenario, args);
      results.push(...entries);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logError(`Scenario "${scenario.id}" failed: ${message}`);
      failures.push(scenario.id);

      if (args.failFast) {
        writeOutput(args.output, results);
        process.exit(1);
      }
    }
  }

  writeOutput(args.output, results);

  if (failures.length > 0) {
    logError(
      `${failures.length} scenario(s) failed: ${failures.join(", ")}. Partial results written to ${args.output}`,
    );
    process.exit(1);
  }

  log(
    fmt.success(
      `Regression benchmark complete — wrote ${results.length} entries to ${args.output}`,
    ),
  );
}

function resolveArgs(argv: string[]): RegressionArgs | undefined {
  const output = getArgValue(argv, "--output");

  if (output === undefined) {
    return undefined;
  }

  const scenariosRaw = getArgValue(argv, "--scenarios");
  const scenarios =
    scenariosRaw !== undefined
      ? scenariosRaw
          .split(",")
          .map((s) => s.trim())
          .filter((s) => s.length > 0)
      : undefined;

  const tag = getArgValue(argv, "--tag");

  const useLocal = argv.includes("--use-local") ? UseLocal.Yes : UseLocal.No;

  const forceCheckout = argv.includes("--force-checkout")
    ? ForceCheckout.Yes
    : ForceCheckout.No;

  const forcePublish = argv.includes("--force-publish")
    ? ForcePublish.Yes
    : ForcePublish.No;

  const failFast = argv.includes("--fail-fast");

  const e2eCloneDirectory =
    getArgValue(argv, "--e2e-clone-dir") ??
    process.env.E2E_CLONE_DIR ??
    DEFAULT_CLONE_DIR;

  return {
    output: path.resolve(output),
    scenarios,
    tag,
    useLocal,
    forceCheckout,
    forcePublish,
    e2eCloneDirectory,
    failFast,
  };
}

function collectScenarios(args: RegressionArgs): ScenarioEntry[] {
  const entries: ScenarioEntry[] = [];

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

    const definition = JSON.parse(raw) as ScenarioDefinitionLike;

    if (definition.disabled === true) {
      logWarning(`Skipping "${entry.name}" (scenario is disabled)`);
      continue;
    }

    if (definition.benchmark?.skip === true) {
      logWarning(`Skipping "${entry.name}" (benchmark.skip is set)`);
      continue;
    }

    if (args.scenarios !== undefined && !args.scenarios.includes(entry.name)) {
      continue;
    }

    if (args.tag !== undefined && !(definition.tags ?? []).includes(args.tag)) {
      continue;
    }

    entries.push({
      id: entry.name,
      scenarioJsonPath,
      definition,
    });
  }

  return entries;
}

function findMissingRunCounts(
  scenarios: ScenarioEntry[],
): Array<{ id: string; missing: string[] }> {
  const missing: Array<{ id: string; missing: string[] }> = [];

  for (const scenario of scenarios) {
    const runs = scenario.definition.benchmark?.runs;
    const absent: string[] = [];

    if (runs?.coldCompile === undefined) {
      absent.push("coldCompile");
    }

    if (runs?.warmCompile === undefined) {
      absent.push("warmCompile");
    }

    if (runs?.defaultCommand === undefined) {
      absent.push("defaultCommand");
    }

    if (absent.length > 0) {
      missing.push({ id: scenario.id, missing: absent });
    }
  }

  return missing;
}

function printMissingRunCountsError(
  missing: Array<{ id: string; missing: string[] }>,
): void {
  logError(
    "Regression benchmark requires benchmark.runs.{coldCompile,warmCompile,defaultCommand} in every scenario.json.",
  );
  console.error("Missing fields:");

  for (const { id, missing: fields } of missing) {
    console.error(`  - end-to-end/${id}/scenario.json: ${fields.join(", ")}`);
  }

  console.error(
    'Add them to scenario.json or set "benchmark": { "skip": true } to opt out.',
  );
}

async function runScenario(
  scenario: ScenarioEntry,
  args: RegressionArgs,
): Promise<BenchmarkEntry[]> {
  const runs = scenario.definition.benchmark?.runs;

  if (
    runs?.coldCompile === undefined ||
    runs.warmCompile === undefined ||
    runs.defaultCommand === undefined
  ) {
    throw new Error(
      `Missing benchmark.runs.* fields for "${scenario.id}" — pre-flight should have caught this`,
    );
  }

  const scenarioTmpDir = path.join(tmpdir(), "hardhat-regression", scenario.id);
  mkdirSync(scenarioTmpDir, { recursive: true });

  const coldExport = path.join(scenarioTmpDir, "cold.json");
  const warmExport = path.join(scenarioTmpDir, "warm.json");
  const defaultExport = path.join(scenarioTmpDir, "default.json");

  logStep("Initializing scenario");
  await e2eInit(
    args.e2eCloneDirectory,
    scenario.scenarioJsonPath,
    args.useLocal,
    args.forceCheckout,
    args.forcePublish,
  );

  await runPhase(
    "compile (cold)",
    buildBenchArgs(scenario.scenarioJsonPath, args, {
      command: "npx hardhat compile",
      prepare: "npx hardhat clean",
      runs: runs.coldCompile,
      exportJson: coldExport,
    }),
  );

  await runPhase(
    "compile (warm)",
    buildBenchArgs(scenario.scenarioJsonPath, args, {
      command: "npx hardhat compile",
      prepare: undefined,
      runs: runs.warmCompile,
      exportJson: warmExport,
    }),
  );

  await runPhase(
    "default command",
    buildBenchArgs(scenario.scenarioJsonPath, args, {
      command: undefined,
      prepare: undefined,
      runs: runs.defaultCommand,
      exportJson: defaultExport,
    }),
  );

  return [
    toEntry(scenario.id, "compile (cold)", readHyperfineResult(coldExport)),
    toEntry(scenario.id, "compile (warm)", readHyperfineResult(warmExport)),
    toEntry(scenario.id, "default command", readHyperfineResult(defaultExport)),
  ];
}

async function runPhase(label: string, benchArgs: BenchArgs): Promise<void> {
  try {
    await runBenchmark(benchArgs);
  } catch (error) {
    const original = error instanceof Error ? error.message : String(error);
    throw new Error(
      `${label} phase failed: ${original}\n  Reproduce with: ${buildReproCommand(benchArgs)}`,
    );
  }
}

function buildReproCommand(benchArgs: BenchArgs): string {
  const parts: string[] = [
    "pnpm bench",
    "--scenario",
    shellQuote(benchArgs.scenarioPath),
  ];

  if (benchArgs.command !== undefined) {
    parts.push("--command", shellQuote(benchArgs.command));
  }

  if (benchArgs.prepare !== undefined) {
    parts.push("--prepare", shellQuote(benchArgs.prepare));
  }

  if (benchArgs.runs !== undefined) {
    parts.push("--runs", String(benchArgs.runs));
  }

  parts.push(
    "--e2e-clone-dir",
    shellQuote(benchArgs.e2eCloneDirectory),
    "--show-output",
  );

  return parts.join(" ");
}

function shellQuote(value: string): string {
  if (/^[\w@./:=-]+$/.test(value)) {
    return value;
  }

  return `'${value.replace(/'/g, `'\\''`)}'`;
}

function buildBenchArgs(
  scenarioPath: string,
  args: RegressionArgs,
  phase: {
    command: string | undefined;
    prepare: string | undefined;
    runs: number;
    exportJson: string;
  },
): BenchArgs {
  return {
    scenarioPath,
    command: phase.command,
    init: false,
    useLocal: UseLocal.No,
    forcePublish: ForcePublish.No,
    forceCheckout: ForceCheckout.No,
    precompile: false,
    prepare: phase.prepare,
    ignoreFailure: false,
    showOutput: false,
    warmup: 0,
    runs: phase.runs,
    exportJson: phase.exportJson,
    e2eCloneDirectory: args.e2eCloneDirectory,
  };
}

function readHyperfineResult(exportPath: string): HyperfineResult {
  const raw = JSON.parse(readFileSync(exportPath, "utf-8")) as {
    results: HyperfineResult[];
  };

  if (!Array.isArray(raw.results) || raw.results.length === 0) {
    throw new Error(`Hyperfine export at ${exportPath} has no results`);
  }

  return raw.results[0];
}

function toEntry(
  scenarioId: string,
  phaseLabel: string,
  result: HyperfineResult,
): BenchmarkEntry {
  return {
    name: `${scenarioId} / ${phaseLabel}`,
    unit: "s",
    value: result.mean,
    range: `± ${result.stddev}`,
    extra: JSON.stringify({
      times: result.times,
      min: result.min,
      max: result.max,
      median: result.median,
    }),
  };
}

function writeOutput(outputPath: string, entries: BenchmarkEntry[]): void {
  mkdirSync(path.dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, JSON.stringify(entries, null, 2));
}

function getArgValue(args: string[], flag: string): string | undefined {
  const idx = args.indexOf(flag);

  return idx !== -1 && idx + 1 < args.length ? args[idx + 1] : undefined;
}

await main();
