// cSpell:ignore cacache <-- NPM's content-addressable cache
import { execSync } from "node:child_process";
import { performance } from "node:perf_hooks";
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { runBenchmark } from "./main.ts";
import type { BenchArgs } from "./helpers/args.ts";
import { computeStats, mean, type BenchmarkStats } from "./helpers/stats.ts";
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
  customSmallerIsBetter format. Every timed name — hyperfine command or
  measured step — emits its wall-clock time plus a sibling "<name> (cpu)"
  entry with the total CPU time (user+system). Wall-clock entries carry
  their per-run samples in the "extra" field; "(cpu)" entries carry their
  mean user/system there instead.

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
          scenarioTmpDir,
          loaded.workingDir,
          loaded.definition.env,
          planned.name,
          planned.cfg,
          new Set(planned.run),
          new Set(planned.once),
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
        // A single run suffices when the command runs purely as a
        // prerequisite of a later entry.
        runs: planned.emit ? planned.cfg.runs : 1,
        exportJson: exportPath,
        memFile,
      }),
    );

    // Non-selected single commands still run above (state prerequisites for a
    // later selected command) but are not reported.
    if (planned.emit) {
      const result = readHyperfineResult(exportPath);
      entries.push(
        ...toEntries(
          scenario.id,
          planned.name,
          result,
          memFile !== undefined && gnuTimeAvailable()
            ? [readPeakRssMb(memFile)]
            : undefined,
        ),
        toCpuEntry(scenario.id, planned.name, result),
      );
    }
  }

  return entries;
}

/**
 * Run a step-sequence command: execute the ordered steps in-process, once per
 * run, timing each step's wall-clock with the high-resolution monotonic clock
 * and its CPU time with bash's `time` builtin (Node exposes no child rusage).
 * Returns a wall-clock entry plus a "(cpu)" entry per emitted step, and a
 * peak-RSS entry when GNU time is available.
 *
 * `runSteps` is the set of step names to execute (selected steps plus their
 * prerequisites); other steps are skipped. `onceSteps` is the subset of those
 * that run purely as cross-command prerequisites — they execute on the final
 * run only, so the sequence's tail matches a full execution while their
 * external dependents still observe them having run. `emit` is the subset to
 * time and report — steps that run but aren't in `emit` are prerequisites only
 * (emitted steps are never in `onceSteps`).
 * Emitted steps are additionally wrapped in GNU time (into `tmpDir`) to capture
 * peak RSS; the wrapper's fork+exec is negligible against multi-second compiles.
 */
function runStepsPhase(
  scenarioId: string,
  scenarioTmpDir: string,
  workingDir: string,
  env: Record<string, string> | undefined,
  seqName: string,
  cfg: StepsVariant,
  runSteps: Set<string>,
  onceSteps: Set<string>,
  emit: Set<string>,
  tmpDir: string,
): BenchmarkEntry[] {
  const totalSteps = Object.keys(cfg.steps).length;
  const stepNames = Object.keys(cfg.steps).filter((n) => runSteps.has(n));

  // With no every-iteration step left, the whole (prerequisite-only)
  // sequence collapses to a single run.
  const runs = stepNames.some((n) => !onceSteps.has(n)) ? cfg.runs : 1;

  logStep(
    `${fmt.pkg(seqName)} (${runs} runs${
      stepNames.length < totalSteps
        ? `, ${stepNames.length} of ${totalSteps} steps`
        : ""
    })`,
  );

  const samples = new Map<
    string,
    { times: number[]; user: number[]; system: number[] }
  >();
  const peakRssMb = new Map<string, number[]>();
  const memFile = (stepName: string) =>
    path.join(tmpDir, `${slugify(seqName)}-${slugify(stepName)}.mem`);

  for (const stepName of stepNames) {
    if (emit.has(stepName)) {
      samples.set(stepName, { times: [], user: [], system: [] });
      peakRssMb.set(stepName, []);
    }
  }

  const timingPath = path.join(scenarioTmpDir, `${slugify(seqName)}-cpu.txt`);

  for (let run = 0; run < runs; run++) {
    for (const stepName of stepNames) {
      if (onceSteps.has(stepName) && run < runs - 1) {
        continue;
      }

      const step = cfg.steps[stepName];
      // Measured (emitted) steps are wrapped twice: GNU time captures peak RSS
      // into the step's mem file (an inner shell covers the whole command, which
      // has shell operators like && and >>), and bash's `time` builtin captures
      // CPU (user/system) into `timingPath`. The command's own stderr detours
      // through fd 3 back to the piped stderr (so failures surface whole below);
      // only `time`'s line reaches timingPath. LC_NUMERIC pins bash's
      // locale-dependent decimal separator. Prerequisite steps run plain.
      const command = emit.has(stepName)
        ? `{ LC_NUMERIC=C; TIMEFORMAT='%U %S'; time { ${wrapWithTime(step.command, memFile(stepName), true)}\n} 2>&3 ; } 3>&2 2>${shellQuote(timingPath)}`
        : step.command;
      const start = performance.now();

      try {
        execSync(command, {
          shell: "/bin/bash",
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
          `${scenarioId} / ${seqName}: step "${stepName}" failed on run ${run + 1}/${runs}: ${original}\n` +
            `  Reproduce with: cd ${shellQuote(workingDir)} && ${step.command}\n` +
            formatOutput({ stdout, stderr }),
          { cause: error },
        );
      }

      const elapsed = (performance.now() - start) / 1000;
      const sample = samples.get(stepName);

      if (sample !== undefined) {
        const cpu = readCpuTiming(timingPath);
        sample.times.push(elapsed);
        sample.user.push(cpu.user);
        sample.system.push(cpu.system);

        if (gnuTimeAvailable()) {
          peakRssMb.get(stepName)?.push(readPeakRssMb(memFile(stepName)));
        }
      }
    }
  }

  return [...samples].flatMap(([stepName, s]) => {
    const stats: BenchmarkStats = {
      ...computeStats(s.times),
      user: mean(s.user),
      system: mean(s.system),
    };
    const cpuStddev = computeStats(
      s.user.map((u, i) => u + s.system[i]),
    ).stddev;

    return [
      ...toEntries(scenarioId, stepName, stats, peakRssMb.get(stepName)),
      toCpuEntry(scenarioId, stepName, stats, cpuStddev),
    ];
  });
}

function readCpuTiming(timingPath: string): { user: number; system: number } {
  const raw = readFileSync(timingPath, "utf-8");
  const [user, system] = raw.trim().split(/\s+/).map(Number);

  if (!Number.isFinite(user) || !Number.isFinite(system)) {
    throw new Error(
      `Unparseable bash time output at ${timingPath}: ${JSON.stringify(raw)}`,
    );
  }

  return { user, system };
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

// hyperfine's per-result object matches BenchmarkStats, including the mean
// `user`/`system` CPU time.
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

function toCpuEntry(
  scenarioId: string,
  phaseLabel: string,
  result: BenchmarkStats,
  // hyperfine exports only mean user/system (no per-run CPU samples), so its
  // entries carry no spread.
  cpuStddev: number = 0,
): BenchmarkEntry {
  return {
    name: `${scenarioId} / ${phaseLabel} (cpu)`,
    unit: "s",
    value: result.user + result.system,
    range: `± ${cpuStddev}`,
    extra: JSON.stringify({ user: result.user, system: result.system }),
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
