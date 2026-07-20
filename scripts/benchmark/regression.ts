// cSpell:ignore cacache <-- NPM's content-addressable cache
import { execSync } from "node:child_process";
import { performance } from "node:perf_hooks";
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
import {
  compilePatterns,
  matchesAny,
  parseGlobList,
  planCommands,
} from "./helpers/plan.ts";
import {
  gnuTimeAvailable,
  readPeakRssMb,
  wrapWithTime,
} from "./helpers/memory.ts";
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

  When GNU time (/usr/bin/time) is available, each benchmark is wrapped in it to
  capture peak RSS (the largest resident set size any process in its subtree
  reached, in MB). This is emitted as a separate "<scenarioId> / <name> (peak
  RSS)" entry (unit MB): its value is the highest peak observed, with the per-run
  peaks and their statistics (mean/stddev/min/max/median) in the entry's extra.
  Step sequences record one peak per run; hyperfine single commands record a
  single aggregate peak across all runs. The highest peak is also embedded as
  "peakRssMb" in the time entry's extra. If GNU time is missing, memory is
  skipped and a warning is printed.

OPTIONS
  --output <path>       Required. Aggregated JSON destination
  --scenarios <globs>   Select scenarios by id (directory basename), as
                        comma-separated glob patterns (e.g. "1inch*"). Default: all.
  --tag <tag>           Filter by a tag present in scenario.json tags
  --benchmarks <globs>  Select which measured entries to report, by name
                        (comma-separated globs, e.g. "test solidity" or
                        "*compile*"). A name is the report label's second segment
                        (single command name or step name). Default: all.
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

  --benchmarks selects which measured entries you want reported. Because entries
  run as a stateful pipeline (later ones depend on earlier ones having run — e.g.
  "test solidity" runs with --no-compile and needs a prior compile), selected
  entries are not run in isolation. Each entry may declare "dependsOn" in
  scenario.json listing the entries it needs; when you select an entry, its
  declared prerequisites also run (unreported) and everything else is skipped. An
  entry with no "dependsOn" has no prerequisites and runs in isolation.
  Entries run in declared order; only selected entries are reported. So
  --benchmarks "test solidity" runs just (cold compile + test solidity), skipping
  the edit&compile steps and warm compile it doesn't depend on.

EXAMPLES
  pnpm bench:regression --output /tmp/regression.json
  pnpm bench:regression --scenarios uniswap-v4-core,aave-v4 --output /tmp/r.json
  pnpm bench:regression --benchmarks "cold compile" --output /tmp/r.json
  pnpm bench:regression --scenarios "1inch*" --benchmarks "test solidity" --output /tmp/r.json
`;

const REPO_ROOT = path.resolve(import.meta.dirname, "..", "..");
const END_TO_END_DIR = path.join(REPO_ROOT, "end-to-end");

interface RegressionArgs {
  output: string;
  scenarios: string[] | undefined;
  tag: string | undefined;
  benchmarks: string[] | undefined;
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

  if (!gnuTimeAvailable()) {
    logWarning(
      "GNU time (/usr/bin/time) not found — peak RSS will not be measured. " +
        "Install the `time` package to enable memory measurements.",
    );
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

  if (args.benchmarks !== undefined && results.length === 0) {
    logError("No benchmarks matched the provided --benchmarks filter");
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

  const benchmarks = parseGlobList(getArgValue(argv, "--benchmarks"));

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
    benchmarks,
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
  const scenarioRes = compilePatterns(args.scenarios);

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

    if (!matchesAny(entry.name, scenarioRes)) {
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

  const plan = planCommands(commands, args.benchmarks);

  if (plan.length === 0) {
    logWarning(
      `Skipping "${scenario.id}" (no commands or steps matched the filters)`,
    );

    return [];
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

  for (const planned of plan) {
    if ("run" in planned) {
      entries.push(
        ...runStepsPhase(
          scenario.id,
          loaded.workingDir,
          loaded.definition.env,
          planned.name,
          planned.cfg,
          new Set(planned.run),
          new Set(planned.emit),
          scenarioTmpDir,
        ),
      );

      continue;
    }

    const exportPath = path.join(
      scenarioTmpDir,
      `${slugify(planned.name)}.json`,
    );
    // Only reported commands need a memory reading; prerequisites run unwrapped.
    const memFile = planned.emit
      ? path.join(scenarioTmpDir, `${slugify(planned.name)}.mem`)
      : undefined;

    await runPhase(
      planned.name,
      buildBenchArgs(scenario.scenarioJsonPath, args, {
        command: planned.cfg.command,
        prepare: planned.cfg.prepare,
        runs: planned.cfg.runs,
        exportJson: exportPath,
        memFile,
      }),
    );

    // Non-selected single commands still run above (state prerequisites for a
    // later selected command) but are not reported.
    if (planned.emit) {
      entries.push(
        ...toEntries(
          scenario.id,
          planned.name,
          readHyperfineResult(exportPath),
          memFile !== undefined && gnuTimeAvailable()
            ? [readPeakRssMb(memFile)]
            : undefined,
        ),
      );
    }
  }

  return entries;
}

/**
 * Run a step-sequence command: execute the ordered steps in-process, once per
 * run, timing each step with the high-resolution monotonic clock. Returns one
 * entry per emitted step.
 *
 * `runSteps` is the set of step names to execute (selected steps plus their
 * prerequisites); other steps are skipped. `emit` is the subset of those to
 * time and report — steps that run but aren't in `emit` are prerequisites only.
 * Emitted steps are wrapped in GNU time (into `tmpDir`) to capture peak RSS;
 * the wrapper's fork+exec is negligible against multi-second compiles.
 */
function runStepsPhase(
  scenarioId: string,
  workingDir: string,
  env: Record<string, string> | undefined,
  seqName: string,
  cfg: StepsVariant,
  runSteps: Set<string>,
  emit: Set<string>,
  tmpDir: string,
): BenchmarkEntry[] {
  const totalSteps = Object.keys(cfg.steps).length;
  const stepNames = Object.keys(cfg.steps).filter((n) => runSteps.has(n));

  logStep(
    `${fmt.pkg(seqName)} (${cfg.runs} runs${
      stepNames.length < totalSteps
        ? `, ${stepNames.length} of ${totalSteps} steps`
        : ""
    })`,
  );

  const samples = new Map<string, number[]>();
  const peakRssMb = new Map<string, number[]>();
  const memFile = (stepName: string) =>
    path.join(tmpDir, `${slugify(seqName)}-${slugify(stepName)}.mem`);

  for (const stepName of stepNames) {
    if (emit.has(stepName)) {
      samples.set(stepName, []);
      peakRssMb.set(stepName, []);
    }
  }

  for (let run = 0; run < cfg.runs; run++) {
    for (const stepName of stepNames) {
      const step = cfg.steps[stepName];
      // Measure memory only for reported steps; the step command has shell
      // operators (&&, >>) so it must run under an inner shell to be covered.
      const command = emit.has(stepName)
        ? wrapWithTime(step.command, memFile(stepName), true)
        : step.command;
      const start = performance.now();

      try {
        execSync(command, {
          cwd: workingDir,
          stdio: ["ignore", "pipe", "pipe"],
          encoding: "utf-8",
          // The default 1 MiB maxBuffer would make chatty-but-successful
          // steps (e.g. a full hardhat compile) throw ENOBUFS.
          maxBuffer: 64 * 1024 * 1024,
          env: { ...process.env, ...env },
        });
      } catch (error) {
        // Only the first line: execSync embeds the child's full stderr in
        // its message, and the streams are appended whole below.
        const original = (
          error instanceof Error ? error.message : String(error)
        ).split("\n", 1)[0];
        const { stdout, stderr } = error as {
          stdout?: string;
          stderr?: string;
        };
        throw new Error(
          `${scenarioId} / ${seqName}: step "${stepName}" failed on run ${run + 1}/${cfg.runs}: ${original}\n` +
            `  Reproduce with: cd ${shellQuote(workingDir)} && ${step.command}\n` +
            formatOutput({ stdout, stderr }),
          { cause: error },
        );
      }

      const elapsed = (performance.now() - start) / 1000;
      samples.get(stepName)?.push(elapsed);

      if (emit.has(stepName) && gnuTimeAvailable()) {
        peakRssMb.get(stepName)?.push(readPeakRssMb(memFile(stepName)));
      }
    }
  }

  return [...samples].flatMap(([stepName, times]) =>
    toEntries(
      scenarioId,
      stepName,
      computeStats(times),
      peakRssMb.get(stepName),
    ),
  );
}

// Failures are rare and abort the scenario, so the whole output is shown
// rather than a tail — a compiler error can sit thousands of warning lines
// above the end.
function formatOutput(streams: { stdout?: string; stderr?: string }): string {
  return Object.entries(streams)
    .map(([name, text]) => [name, (text ?? "").trimEnd()] as const)
    .filter(([, text]) => text !== "")
    .map(([name, text]) => `  --- ${name} ---\n${text}`)
    .join("\n");
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
    memFile: string | undefined;
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
    memFile: phase.memFile,
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

// One benchmark produces a timing entry and, when peak RSS was captured, a
// separate memory entry (its own MB series, independently charted + alerted).
// `peakRssMb` holds one peak per run (a single aggregate value for hyperfine
// single commands, one per outer run for step sequences). The tracked value
// is the highest peak; the full per-run distribution goes in the entry's
// `extra`, and the peak is also embedded in the timing entry's `extra`
// for convenience.
function toEntries(
  scenarioId: string,
  phaseLabel: string,
  result: BenchmarkStats,
  peakRssMb: number[] | undefined,
): BenchmarkEntry[] {
  const rss =
    peakRssMb !== undefined && peakRssMb.length > 0
      ? computeStats(peakRssMb)
      : undefined;

  const timeEntry: BenchmarkEntry = {
    name: `${scenarioId} / ${phaseLabel}`,
    unit: "s",
    value: result.mean,
    range: `± ${result.stddev}`,
    extra: JSON.stringify({
      times: result.times,
      min: result.min,
      max: result.max,
      median: result.median,
      mean: result.mean,
      ...(rss !== undefined ? { peakRssMb: rss.max } : {}),
    }),
  };

  if (rss === undefined) {
    return [timeEntry];
  }

  const memEntry: BenchmarkEntry = {
    name: `${scenarioId} / ${phaseLabel} (peak RSS)`,
    unit: "MB",
    // Peak RSS is a max within each run; across runs we track the highest peak
    // and expose the spread (mean/stddev/…) in `extra`.
    value: rss.max,
    range: `± ${rss.stddev}`,
    extra: JSON.stringify({
      values: rss.times,
      min: rss.min,
      max: rss.max,
      median: rss.median,
      mean: rss.mean,
      stddev: rss.stddev,
    }),
  };

  return [timeEntry, memEntry];
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
