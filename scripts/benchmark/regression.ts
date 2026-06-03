// cSpell:ignore cacache <-- NPM's content-addressable cache
import { execSync } from "node:child_process";
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { runBenchmark } from "./main.ts";
import type { BenchArgs } from "./helpers/args.ts";
import { computeStats, type BenchmarkStats } from "./helpers/stats.ts";
import { DEFAULT_CLONE_DIR } from "../end-to-end/helpers/args.ts";
import { fmt, log, logError, logStep, logWarning } from "./helpers/log.ts";
import { loadScenario } from "../end-to-end/helpers/directory.ts";
import {
  ForceCheckout,
  ForcePublish,
  UseLocal,
  init as e2eInit,
} from "../end-to-end/subcommands/init.ts";
import { isScenarioDefinition } from "../end-to-end/schema/scenario-schema.ts";
import type { ScenarioDefinition, StepsVariant } from "../end-to-end/types.ts";
import { isVerdaccioRunning } from "../verdaccio/helpers/shell.ts";
import {
  publish as verdaccioPublish,
  sinceReleasePublish,
} from "../verdaccio/publish.ts";
import { start as verdaccioStart } from "../verdaccio/start.ts";
import { stop as verdaccioStop } from "../verdaccio/stop.ts";

const USAGE = `
scripts/benchmark/regression.ts — Multi-scenario regression benchmark

DESCRIPTION
  For each scenario under end-to-end/ that is not disabled and does not opt
  out via "benchmark": { "skip": true }, runs every command declared in
  "benchmark": { "commands": { ... } } in the order they appear in
  scenario.json. Each command entry is one of two shapes:

    // single command, benchmarked with hyperfine
    {
      "runs":    <positive integer>,    // hyperfine runs (required)
      "prepare": "<shell snippet>",     // optional --prepare hook
      "command": "<shell command>"      // command to benchmark (required)
    }

    // step sequence, timed in-process (no hyperfine, no per-run prepare)
    {
      "runs":  <positive integer>,      // times to run the whole sequence
      "steps": {                         // ordered; each step timed individually
        "<step name>": {
          "command": "<shell command>", // required
          "measure": <boolean>          // optional, default true; false = run but
        }                               //   don't emit an entry (e.g. a reset step)
      }
    }

  Step sequences share state across steps, so a single reset/cold step per run
  replaces the redundant per-run prepare recompiles. The command name (or, for a
  sequence, each measured step name) becomes the on-disk benchmark name:
  "<scenarioId> / <name>". Scenarios missing the "commands" map (or with an
  empty one) fail pre-flight with a summary of every offending file.

  Writes a flat JSON array in benchmark-action/github-action-benchmark's
  customSmallerIsBetter format. Per-run times are preserved in the "extra"
  field as a JSON-stringified object.

OPTIONS
  --output <path>       Required. Aggregated JSON destination
  --scenarios <csv>     Filter by scenario id (directory basename)
  --tag <tag>           Filter by a tag present in scenario.json tags
  --use-local           Detect packages changed since their release tag, bump
                        versions, publish to Verdaccio, and pin scenario deps to
                        the published versions.
                        If Verdaccio is already running, an error is thrown unless
                        --force-publish is also passed.
  --force-checkout      Force git checkouts even if there are uncommitted changes
                        in the scenario working directory
  --force-publish       Allow publishing to an already-running Verdaccio instance,
                        potentially overwriting its current contents
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
  definition: ScenarioDefinition;
}

interface BenchmarkEntry {
  name: string;
  unit: string;
  value: number;
  range: string;
  extra: string;
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

  const results: BenchmarkEntry[] = [];
  const failures: string[] = [];

  // Launch Verdaccio once so that:
  // 1. all scenarios share the same registry contents — bumped versions
  //    remain available throughout the run, and
  // 2. pacote's metadata cache (`~/.npm/_cacache`, keyed by registry URL)
  //    never gets out of sync with the registry's actual contents.
  //
  // Per-scenario init() detects the already-running Verdaccio and skips
  // its own start/publish/stop.
  const verdaccioAlreadyRunning = isVerdaccioRunning();

  if (
    verdaccioAlreadyRunning &&
    args.useLocal === UseLocal.Yes &&
    args.forcePublish === ForcePublish.No
  ) {
    throw new Error(
      "A Verdaccio instance is already running. Using --use-local would\n" +
        "  override packages in the running registry.\n\n" +
        "  Add --force-publish to proceed, or stop the running instance first:\n" +
        "    pnpm verdaccio stop",
    );
  }

  if (!verdaccioAlreadyRunning) {
    await verdaccioStart(true);
  }

  const startedVerdaccio = !verdaccioAlreadyRunning;
  let failFastExit = false;

  try {
    if (startedVerdaccio || args.forcePublish === ForcePublish.Yes) {
      if (args.useLocal === UseLocal.Yes) {
        sinceReleasePublish();
      } else {
        verdaccioPublish(false, true);
      }
    }

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
          failFastExit = true;
          break;
        }
      }
    }
  } finally {
    if (startedVerdaccio) {
      verdaccioStop();
    }
  }

  writeOutput(args.output, results);

  if (failFastExit) {
    logError(
      `Aborted on first failure (--fail-fast). Partial results (${results.length} entries) written to ${args.output}`,
    );
    process.exit(1);
  }

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
  const invalid: string[] = [];

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

    let parsed: unknown;

    try {
      parsed = JSON.parse(raw);
    } catch (error) {
      invalid.push(
        `${entry.name}: invalid JSON — ${error instanceof Error ? error.message : String(error)}`,
      );

      continue;
    }

    if (!isScenarioDefinition(parsed)) {
      invalid.push(`${entry.name}: does not match scenario schema`);

      continue;
    }

    const definition = parsed;

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

    if (args.tag !== undefined && !definition.tags.includes(args.tag)) {
      continue;
    }

    entries.push({
      id: entry.name,
      scenarioJsonPath,
      definition,
    });
  }

  if (invalid.length > 0) {
    logError(
      "Invalid scenario.json files (must be fixed before bench:regression can run):",
    );

    for (const line of invalid) {
      console.error(`  - ${line}`);
    }

    process.exit(1);
  }

  return entries;
}

async function runScenario(
  scenario: ScenarioEntry,
  args: RegressionArgs,
): Promise<BenchmarkEntry[]> {
  const commands = scenario.definition.benchmark?.commands;

  if (commands === undefined || Object.keys(commands).length === 0) {
    throw new Error(
      `Missing benchmark.commands for "${scenario.id}" — schema validation should have caught this`,
    );
  }

  const scenarioTmpDir = path.join(tmpdir(), "hardhat-regression", scenario.id);
  mkdirSync(scenarioTmpDir, { recursive: true });

  logStep("Initializing scenario");
  await e2eInit(
    args.e2eCloneDirectory,
    scenario.scenarioJsonPath,
    args.useLocal,
    args.forceCheckout,
    // always skip per-scenario publish — we publish once globally up-front
    ForcePublish.No,
  );

  // Load the initialized scenario once to resolve its working directory and
  // env (with ${localEnv:...} tokens expanded, like exec.ts); reused by every
  // steps phase below instead of reloading per phase.
  const loaded = loadScenario(
    args.e2eCloneDirectory,
    scenario.scenarioJsonPath,
  );

  const entries: BenchmarkEntry[] = [];

  for (const [name, cfg] of Object.entries(commands)) {
    if ("steps" in cfg) {
      entries.push(
        ...runStepsPhase(
          scenario.id,
          loaded.workingDir,
          loaded.definition.env,
          name,
          cfg,
        ),
      );

      continue;
    }

    const exportPath = path.join(scenarioTmpDir, `${slugify(name)}.json`);

    await runPhase(
      name,
      buildBenchArgs(scenario.scenarioJsonPath, args, {
        command: cfg.command,
        prepare: cfg.prepare,
        runs: cfg.runs,
        exportJson: exportPath,
      }),
    );

    entries.push(toEntry(scenario.id, name, readHyperfineResult(exportPath)));
  }

  return entries;
}

/**
 * Run a step-sequence command: execute the ordered steps in-process, once per
 * run, timing each step with the high-resolution monotonic clock. Returns one
 * entry per measured step.
 */
function runStepsPhase(
  scenarioId: string,
  workingDir: string,
  env: Record<string, string> | undefined,
  seqName: string,
  cfg: StepsVariant,
): BenchmarkEntry[] {
  logStep(`${fmt.pkg(seqName)} (${cfg.runs} runs)`);

  const stepNames = Object.keys(cfg.steps);
  const samples = new Map<string, number[]>();

  for (const stepName of stepNames) {
    if (cfg.steps[stepName].measure !== false) {
      samples.set(stepName, []);
    }
  }

  for (let run = 0; run < cfg.runs; run++) {
    for (const stepName of stepNames) {
      const step = cfg.steps[stepName];
      const start = performance.now();

      try {
        execSync(step.command, {
          cwd: workingDir,
          stdio: "inherit",
          env: { ...process.env, ...env },
        });
      } catch (error) {
        const original = error instanceof Error ? error.message : String(error);
        throw new Error(
          `${scenarioId} / ${seqName}: step "${stepName}" failed on run ${run + 1}/${cfg.runs}: ${original}\n` +
            `  Reproduce with: cd ${shellQuote(workingDir)} && ${step.command}`,
          { cause: error },
        );
      }

      const elapsed = (performance.now() - start) / 1000;
      samples.get(stepName)?.push(elapsed);
    }
  }

  return [...samples].map(([stepName, times]) =>
    toEntry(scenarioId, stepName, computeStats(times)),
  );
}

function slugify(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
}

async function runPhase(label: string, benchArgs: BenchArgs): Promise<void> {
  try {
    await runBenchmark(benchArgs);
  } catch (error) {
    const original = error instanceof Error ? error.message : String(error);
    throw new Error(
      `${label} phase failed: ${original}\n  Reproduce with: ${buildReproCommand(benchArgs)}`,
      { cause: error },
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

function readHyperfineResult(exportPath: string): BenchmarkStats {
  const raw = JSON.parse(readFileSync(exportPath, "utf-8")) as {
    results: BenchmarkStats[];
  };

  if (!Array.isArray(raw.results) || raw.results.length === 0) {
    throw new Error(`Hyperfine export at ${exportPath} has no results`);
  }

  return raw.results[0];
}

function toEntry(
  scenarioId: string,
  phaseLabel: string,
  result: BenchmarkStats,
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
