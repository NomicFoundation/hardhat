// cSpell:ignore cacache <-- NPM's content-addressable cache
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

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
  measureShellSpawnOverhead,
  runMeasured,
  runPlain,
  runPrepare,
  runSeries,
  shellQuote,
  type MeasuredRun,
} from "./helpers/runner.ts";
import { procSamplingAvailable } from "./helpers/mem-sampler.ts";
import {
  measuredRunsToEntries,
  type BenchmarkEntry,
} from "./helpers/entries.ts";
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

  Step sequences share state across steps, so state carries between them
  without re-preparing before every run. The command name (or, for a
  sequence, each measured step name) becomes the on-disk benchmark name:
  "<scenarioId> / <name>". Scenarios missing the "commands" map (or with an
  empty one) fail pre-flight with a summary of every offending file.

  Writes a flat JSON array in benchmark-action/github-action-benchmark's
  customSmallerIsBetter format. Every timed name — single command or
  measured step — emits its wall-clock time plus a sibling "<name> (cpu)"
  entry with the total CPU time (user+system). Wall-clock entries carry
  their per-run samples in the "extra" field; "(cpu)" entries carry their
  mean user/system there instead.

  On Linux, the process tree of every measured run is additionally sampled
  every 100 ms via /proc, tracking each process's peak RSS. A process
  shorter than the sampling interval can be missed. This is emitted as a
  separate "<scenarioId> / <name> (peak RSS)" entry (unit MB). Its value is
  the highest single-process peak observed across runs,
  with the per-run peaks and their statistics (mean/stddev/min/max/median)
  in the entry's extra. The highest peak is also embedded as "peakRssMb" in
  the time entry's extra. When /proc is unavailable (e.g. macOS), memory
  entries are skipped and a warning is printed.

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
      "Linux /proc is unavailable — peak RSS entries will be skipped (timing is unaffected)",
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
  // phase below instead of reloading per phase.
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
    } else {
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
  }

  return entries;
}

/**
 * Run a single-command benchmark: `cfg.runs` measured runs, each preceded by
 * the optional unmeasured `cfg.prepare` hook. A non-selected command runs
 * once, unmeasured. Its dependents only observe that it ran before them.
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
        await runPrepare(cfg.prepare, { cwd: workingDir, env });
      }

      await runPlain(cfg.command, { cwd: workingDir, env });

      return [];
    }

    const measured = await runSeries(
      cfg.command,
      path.join(scenarioTmpDir, `${slugify(name)}-cpu.txt`),
      {
        cwd: workingDir,
        env,
        runs: cfg.runs,
        prepare: cfg.prepare,
        onRunCompleted: (run, i) =>
          log(`  run ${i + 1}/${cfg.runs}: ${formatRun(run)}`),
      },
    );

    return measuredRunsToEntries(scenarioId, name, measured);
  } catch (error) {
    throw benchmarkError(
      `${scenarioId} / ${name} failed`,
      cfg.command,
      workingDir,
      env,
      error,
    );
  }
}

/**
 * Run a step-sequence command: execute the ordered steps once per run, each
 * measured step through the shared runner (wall-clock, CPU and peak RSS in a
 * single spawn). Returns the entries of every emitted step.
 *
 * `runSteps` is the set of step names to execute (selected steps plus their
 * prerequisites); other steps are skipped. `onceSteps` is the subset of those
 * that run purely as cross-command prerequisites. They execute on the final
 * run only, so the sequence's tail matches a full execution while their
 * external dependents still observe them having run. `emit` is the subset to
 * measure and report; steps that run but aren't in `emit` run unmeasured.
 * Emitted steps are never in `onceSteps`.
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
  const calibration = samples.size > 0 ? await measureShellSpawnOverhead() : 0;

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
          const measured = await runMeasured(
            step.command,
            timingPath,
            calibration,
            {
              cwd: workingDir,
              env,
            },
          );
          stepRuns.push(measured);
          log(`  ${stepName} run ${run + 1}/${runs}: ${formatRun(measured)}`);
        } else {
          await runPlain(step.command, { cwd: workingDir, env });
        }
      } catch (error) {
        throw benchmarkError(
          `${scenarioId} / ${seqName}: step "${stepName}" failed on run ${run + 1}/${runs}`,
          step.command,
          workingDir,
          env,
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
// repro hint, and the captured output. The scenario's env var names are
// listed so the repro can be completed — values stay out of the message,
// which lands in CI logs and may hold secrets (e.g. RPC URLs).
function benchmarkError(
  context: string,
  command: string,
  workingDir: string,
  env: Record<string, string> | undefined,
  error: unknown,
): Error {
  const original = (
    error instanceof Error ? error.message : String(error)
  ).split("\n", 1)[0];
  const output =
    error instanceof CommandFailedError
      ? formatOutput({ stdout: error.stdout, stderr: error.stderr })
      : "";
  const envNames = Object.keys(env ?? {});
  const envHint =
    envNames.length > 0
      ? `  The command ran with scenario env vars: ${envNames.join(", ")} (values in scenario.json)\n`
      : "";

  return new Error(
    `${context}: ${original}\n` +
      `  Reproduce with: cd ${shellQuote(workingDir)} && ${command}\n` +
      envHint +
      output,
    { cause: error },
  );
}

function formatRun(run: MeasuredRun): string {
  return (
    `${run.wallSeconds.toFixed(3)} s` +
    (run.peakRssMb !== undefined ? `, peak RSS ${run.peakRssMb} MB` : "")
  );
}

function slugify(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
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
