// cSpell:ignore cacache <-- NPM's content-addressable cache
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import {
  computeStats,
  mean,
  type BenchmarkStats,
  type TimingStats,
} from "./helpers/stats.ts";
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
import type {
  CommandVariant,
  ScenarioDefinition,
  StepsVariant,
} from "../end-to-end/types.ts";
import {
  compilePatterns,
  matchesAny,
  parseGlobList,
  planCommands,
} from "./helpers/plan.ts";
import {
  CommandFailedError,
  formatOutput,
  runMeasured,
  runPlain,
  runSeries,
  shellQuote,
  type MeasuredRun,
} from "./helpers/runner.ts";
import {
  encodeSeriesTable,
  fiveNumberSummary,
  pickRepresentativeRun,
  procSamplingAvailable,
  toSeriesTable,
  treeTotalMb,
} from "./helpers/mem-series.ts";
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

    // single command
    {
      "runs":    <positive integer>,    // measured runs (required)
      "prepare": "<shell snippet>",     // optional unmeasured pre-run hook
      "command": "<shell command>"      // command to benchmark (required)
    }

    // step sequence (no per-run prepare)
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

  Single commands and measured steps are executed identically: one bash spawn
  per run, wall-clock timed in-process (with the shell-spawn overhead measured
  up-front and subtracted, like hyperfine's calibration) and CPU timed by
  bash's \`time\` builtin.

  Writes a flat JSON array in benchmark-action/github-action-benchmark's
  customSmallerIsBetter format. Every timed name — single command or
  measured step — emits its wall-clock time plus a sibling "<name> (cpu)"
  entry with the total CPU time (user+system). Both carry their per-run
  samples and statistics (times/min/max/median/mean) in the "extra" field;
  the "(cpu)" entry additionally carries its mean user/system split.

  On Linux, the process tree of every measured run is additionally sampled
  every 100 ms via /proc, yielding two memory entries per name:
  - "<scenarioId> / <name> (peak RSS)" (unit MB): the largest resident set
    size any single process in the subtree reached, read exactly from the
    kernel's VmHWM high-water mark (the same counter GNU time's %M reports).
    Its value is the highest peak across runs, with the per-run peaks and
    their statistics (mean/stddev/min/max/median) in the entry's extra; the
    highest peak is also embedded as "peakRssMb" in the time entry's extra.
  - "<scenarioId> / <name> (mem over time)" (unit MB): memory consumption
    over the course of a run. Its value is the median across runs of the
    run's median tree-total RSS. The extra field carries the raw per-process
    series of one representative run (the run with the median peak) as a
    shared "tMs" axis plus one MB array per process label — losslessly
    compressed into "seriesGz" (base64 of gzip of the delta-encoded table)
    unless the raw "series" object is smaller — and, per run, its duration,
    exact peak, and [p0,p25,p50,p75,p100] summary of the tree-total RSS.
  When /proc is unavailable (e.g. macOS), memory entries are skipped and a
  warning is printed.

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
  Entries run in declared order; only selected entries are reported.

  Unreported prerequisites run as few times as possible: a dependent only needs
  to observe that a prerequisite in a different command ran once before it, so
  cross-command prerequisites run a single time (a prerequisite command or
  step sequence runs once instead of its configured "runs"). Within a step
  sequence, prerequisites of a measured step still run on every iteration —
  steps are sequential, so each iteration of the dependent expects them to have
  just run. So --benchmarks "test solidity" runs (reset + cold compile) once,
  then test solidity its configured number of times, skipping the edit&compile
  steps and warm compile it doesn't depend on.

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

  if (!procSamplingAvailable()) {
    logWarning(
      "/proc is not available — peak RSS and memory-over-time will not be " +
        "measured. Memory measurements require Linux.",
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
        ...(await runStepsPhase(
          scenario.id,
          scenarioTmpDir,
          loaded.workingDir,
          loaded.definition.env,
          planned.name,
          planned.cfg,
          new Set(planned.run),
          new Set(planned.once),
          new Set(planned.emit),
        )),
      );

      continue;
    }

    entries.push(
      ...(await runCommandPhase(
        scenario.id,
        scenarioTmpDir,
        loaded.workingDir,
        loaded.definition.env,
        planned.name,
        planned.cfg,
        planned.emit,
      )),
    );
  }

  return entries;
}

/**
 * Run a single-command benchmark: `cfg.runs` measured runs, each preceded by
 * the optional unmeasured `cfg.prepare` hook. Non-selected commands still run
 * (state prerequisites for a later selected command) but are not measured or
 * reported — and only once instead of their configured `runs`, since their
 * dependents only observe that they ran once before them.
 */
async function runCommandPhase(
  scenarioId: string,
  scenarioTmpDir: string,
  workingDir: string,
  env: Record<string, string> | undefined,
  name: string,
  cfg: CommandVariant,
  emit: boolean,
): Promise<BenchmarkEntry[]> {
  const runs = emit ? cfg.runs : 1;

  logStep(`${fmt.pkg(name)} (${runs} run${runs === 1 ? "" : "s"})`);

  try {
    if (!emit) {
      if (cfg.prepare !== undefined) {
        await runPlain(cfg.prepare, { cwd: workingDir, env });
      }

      await runPlain(cfg.command, { cwd: workingDir, env });

      return [];
    }

    const runs = await runSeries(
      cfg.command,
      path.join(scenarioTmpDir, `${slugify(name)}-cpu.txt`),
      { cwd: workingDir, env, runs: cfg.runs, prepare: cfg.prepare },
    );

    return measuredRunsToEntries(scenarioId, name, runs);
  } catch (error) {
    throw benchmarkError(
      `${scenarioId} / ${name} failed`,
      cfg.command,
      workingDir,
      error,
    );
  }
}

/**
 * Run a step-sequence command: execute the ordered steps once per run, each
 * measured step through the shared runner (wall-clock, CPU and memory in a
 * single spawn). Returns the entries of every emitted step.
 *
 * `runSteps` is the set of step names to execute (selected steps plus their
 * prerequisites); other steps are skipped. `onceSteps` is the subset of those
 * that run purely as cross-command prerequisites — they execute on the final
 * run only, so the sequence's tail matches a full execution while their
 * external dependents still observe them having run. `emit` is the subset to
 * measure and report — steps that run but aren't in `emit` are prerequisites
 * only and run unmeasured (emitted steps are never in `onceSteps`).
 */
async function runStepsPhase(
  scenarioId: string,
  scenarioTmpDir: string,
  workingDir: string,
  env: Record<string, string> | undefined,
  seqName: string,
  cfg: StepsVariant,
  runSteps: Set<string>,
  onceSteps: Set<string>,
  emit: Set<string>,
): Promise<BenchmarkEntry[]> {
  const totalSteps = Object.keys(cfg.steps).length;
  const stepNames = Object.keys(cfg.steps).filter((n) => runSteps.has(n));

  // With no every-iteration step left, the whole (prerequisite-only)
  // sequence collapses to a single run.
  const runs = stepNames.some((n) => !onceSteps.has(n)) ? cfg.runs : 1;

  logStep(
    `${fmt.pkg(seqName)} (${runs} run${runs === 1 ? "" : "s"}${
      stepNames.length < totalSteps
        ? `, ${stepNames.length} of ${totalSteps} steps`
        : ""
    })`,
  );

  const samples = new Map<string, MeasuredRun[]>();

  for (const stepName of stepNames) {
    if (emit.has(stepName)) {
      samples.set(stepName, []);
    }
  }

  const timingPath = path.join(scenarioTmpDir, `${slugify(seqName)}-cpu.txt`);

  for (let run = 0; run < runs; run++) {
    for (const stepName of stepNames) {
      // Steps that only need to run once do so on the last run, so their
      // result can be observed by subsequent commands.
      if (onceSteps.has(stepName) && run < runs - 1) {
        continue;
      }

      const step = cfg.steps[stepName];
      const stepRuns = samples.get(stepName);

      try {
        if (stepRuns !== undefined) {
          stepRuns.push(
            await runMeasured(step.command, timingPath, {
              cwd: workingDir,
              env,
            }),
          );
        } else {
          // Prerequisite steps run plain.
          await runPlain(step.command, { cwd: workingDir, env });
        }
      } catch (error) {
        throw benchmarkError(
          `${scenarioId} / ${seqName}: step "${stepName}" failed on run ${run + 1}/${runs}`,
          step.command,
          workingDir,
          error,
        );
      }
    }
  }

  return [...samples].flatMap(([stepName, stepRuns]) =>
    measuredRunsToEntries(scenarioId, stepName, stepRuns),
  );
}

// Contextualize a failed benchmark command: first line of the failure, a
// repro hint, and the captured output. The whole output is shown rather than
// a tail — failures are rare and abort the scenario, and a compiler error can
// sit thousands of warning lines above the end.
function benchmarkError(
  context: string,
  command: string,
  workingDir: string,
  error: unknown,
): Error {
  const original = (
    error instanceof Error ? error.message : String(error)
  ).split("\n", 1)[0];
  const output =
    error instanceof CommandFailedError
      ? formatOutput({ stdout: error.stdout, stderr: error.stderr })
      : "";

  return new Error(
    `${context}: ${original}\n` +
      `  Reproduce with: cd ${shellQuote(workingDir)} && ${command}\n` +
      output,
    { cause: error },
  );
}

// Aggregate the measured runs of one benchmark name into its report entries:
// wall-clock (+ embedded peak), "(cpu)", "(peak RSS)" and "(mem over time)".
function measuredRunsToEntries(
  scenarioId: string,
  label: string,
  runs: MeasuredRun[],
): BenchmarkEntry[] {
  const stats: BenchmarkStats = {
    ...computeStats(runs.map((r) => r.wallSeconds)),
    user: mean(runs.map((r) => r.user)),
    system: mean(runs.map((r) => r.system)),
  };
  const cpuStats = computeStats(runs.map((r) => r.user + r.system));

  const memories = runs
    .map((r) => r.memory)
    .filter((memory) => memory !== undefined);
  const peakRssMb =
    memories.length === runs.length
      ? memories.map((memory) => memory.peakRssMb)
      : undefined;

  return [
    ...toEntries(scenarioId, label, stats, peakRssMb),
    toCpuEntry(scenarioId, label, stats, cpuStats),
    ...toMemOverTimeEntries(scenarioId, label, runs),
  ];
}

function slugify(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
}

// One benchmark produces a timing entry and, when peak RSS was captured, a
// separate memory entry (its own MB series, independently charted + alerted).
// `peakRssMb` holds one exact peak (max single-process VmHWM) per run. The
// tracked value is the highest peak; the full per-run distribution goes in
// the entry's `extra`, and the peak is also embedded in the timing entry's
// `extra` for convenience.
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
    range: "",
    extra: JSON.stringify({
      times: rss.times,
      min: rss.min,
      max: rss.max,
      median: rss.median,
      mean: rss.mean,
      stddev: rss.stddev,
    }),
  };

  return [timeEntry, memEntry];
}

// The CPU entry: its tracked value is the mean total CPU time (user+system).
// `extra` mirrors the wall-clock entry — per-run totals plus their statistics
// — extended with the mean user/system split.
function toCpuEntry(
  scenarioId: string,
  phaseLabel: string,
  result: BenchmarkStats,
  cpu: TimingStats,
): BenchmarkEntry {
  return {
    name: `${scenarioId} / ${phaseLabel} (cpu)`,
    unit: "s",
    value: cpu.mean,
    range: `± ${cpu.stddev}`,
    extra: JSON.stringify({
      times: cpu.times,
      min: cpu.min,
      max: cpu.max,
      median: cpu.median,
      mean: cpu.mean,
      user: result.user,
      system: result.system,
    }),
  };
}

// The memory-over-time entry: its charted value is the median across runs of
// the run's median tree-total RSS (a stable scalar for drift alerting), while
// `extra` carries the raw sampled series of the representative run — one MB
// array per process label on a shared `tMs` axis, encoded by
// encodeSeriesTable (usually delta+gzip+base64 in `seriesGz`, raw under
// `series` when tiny) — plus each run's duration, exact peak and
// [p0,p25,p50,p75,p100] tree-total summary. Skipped (empty) when /proc
// sampling is unavailable or a run yielded no samples.
function toMemOverTimeEntries(
  scenarioId: string,
  phaseLabel: string,
  runs: MeasuredRun[],
): BenchmarkEntry[] {
  const memories = runs.map((r) => r.memory);

  if (
    memories.some(
      (memory) => memory === undefined || memory.samples.length === 0,
    )
  ) {
    return [];
  }

  const defined = memories as Array<NonNullable<(typeof memories)[number]>>;
  const summaries = defined.map((memory) =>
    fiveNumberSummary(memory.samples.map(treeTotalMb)).map(Math.round),
  );
  const representative = pickRepresentativeRun(summaries.map((s) => s[4]));
  const p50Stats = computeStats(summaries.map((s) => s[2]));
  const table = toSeriesTable(defined[representative].samples);

  return [
    {
      name: `${scenarioId} / ${phaseLabel} (mem over time)`,
      unit: "MB",
      value: p50Stats.median,
      range: `± ${p50Stats.stddev}`,
      extra: JSON.stringify({
        representativeRun: representative,
        ...encodeSeriesTable(table),
        runs: runs.map((run, i) => ({
          durationMs: Math.round(run.wallSeconds * 1000),
          peakRssMb: defined[i].peakRssMb,
          total: summaries[i],
        })),
      }),
    },
  ];
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
