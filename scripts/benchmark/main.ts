import { mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { exec as e2eExec } from "../end-to-end/subcommands/exec.ts";
import { loadScenario } from "../end-to-end/helpers/directory.ts";
import { ensureScenarioInitialized } from "../end-to-end/helpers/scenario-setup.ts";
import { resolveAndValidateArgs, type BenchArgs } from "./helpers/args.ts";
import { fmt, log, logStep, logError, logWarning } from "./helpers/log.ts";
import { computeStats } from "./helpers/stats.ts";
import {
  buildExport,
  summarize,
  type RunSummary,
} from "./helpers/bench-export.ts";
import {
  CommandFailedError,
  formatOutput,
  reportPathsIn,
  runSeries,
  type MeasuredRun,
} from "./helpers/runner.ts";
import {
  PEAK_RSS_METHOD_NAMES,
  resolvePeakRssMethod,
  type PeakRssMethod,
} from "./helpers/peak-rss.ts";

const DEFAULT_RUNS = 10;

const USAGE = `
scripts/benchmark/main.ts — Benchmark Hardhat scenarios

DESCRIPTION
  Initializes an e2e scenario and benchmarks a command, reporting
  wall-clock time, CPU time and peak memory (RSS) across the runs.
  Timings exclude the shell's own start-up cost. Peak memory needs GNU
  time or Linux /proc; without either (e.g. macOS) it is skipped with a
  warning.
  Use --use-local to detect changed packages, publish them to Verdaccio,
  and pin the scenario to those versions before benchmarking.

OPTIONS
  --scenario <path>     Scenario folder or scenario.json (required)
  --command <cmd>       Command to benchmark (default: scenario's defaultCommand)
  --init                Force (re-)initialization of the scenario even if it is
                        already set up. Without this flag, an existing setup is
                        reused; a missing working directory is initialized
                        automatically
  --use-local           Detect packages changed since their release tag, bump
                        versions, publish to Verdaccio, and pin scenario deps to
                        the published versions. If Verdaccio is already running,
                        publish is skipped (the existing registry contents are
                        reused) unless --force-publish is also passed.
                        Only applies when init runs
  --force-checkout      Force git checkouts even if there are uncommitted changes
                        in the scenario working directory
  --force-publish       Force publishing to an already-running Verdaccio instance,
                        potentially overwriting its current contents.
                        Only applies when init runs
  --precompile          Run "npx hardhat compile" in the scenario before
                        benchmarking (useful for warming up compilation caches)
  --prepare <cmd>       Execute CMD unmeasured before each benchmark run
                        (warmup runs included). Useful for clearing disk
                        caches or resetting state between runs
  --warmup <n>          Unmeasured warmup runs before benchmarking (default: 0).
                        Useful for filling disk caches for I/O-heavy programs
  --runs <n>            Number of benchmark runs (default: ${DEFAULT_RUNS})
  --ignore-failure      Ignore non-zero exit codes of the benchmarked command
  --show-output         Print stdout and stderr of the benchmarked command
  --peak-rss <method>   Peak-memory method: "gnu-time" or "sampler" (default:
                        GNU time when available, else the sampler). An
                        explicit choice this machine cannot provide fails at
                        startup
  --export-json <path>  Write a JSON report to PATH (resolved against the
                        invoking directory): per-run times with their
                        statistics, mean user/system CPU time, and each run's
                        peak RSS (null when unmeasured)
  --e2e-clone-dir <p>   Override clone directory (default: same as pnpm e2e)

EXAMPLES
  pnpm bench --scenario ./end-to-end/uniswap-v4-core --runs 1
  pnpm bench --scenario ./end-to-end/uniswap-v4-core --use-local --precompile
  pnpm bench --scenario ./end-to-end/openzeppelin-contracts --command "npx hardhat compile"
`;

export async function runBenchmark(benchArgs: BenchArgs): Promise<void> {
  const {
    scenarioPath,
    command,
    init,
    useLocal,
    forceCheckout,
    forcePublish,
    precompile,
    prepare,
    ignoreFailure,
    showOutput,
    warmup,
    exportJson,
    e2eCloneDirectory,
  } = benchArgs;

  const scenario = loadScenario(e2eCloneDirectory, scenarioPath);

  if (scenario.definition.disabled === true) {
    logWarning(`Scenario "${scenario.id}" is disabled`);
    return;
  }

  const benchCommand = command ?? scenario.definition.defaultCommand;
  const runs = benchArgs.runs ?? DEFAULT_RUNS;

  // Resolve before scenario setup: an explicit --peak-rss this machine
  // cannot provide must fail here, not after minutes of init and precompile.
  const peakRssMethod = resolvePeakRssMethod(benchArgs.peakRssMethod);

  // pnpm runs scripts from the package root; INIT_CWD preserves the
  // directory the user actually invoked from.
  const exportPath =
    exportJson !== undefined
      ? path.resolve(process.env.INIT_CWD ?? process.cwd(), exportJson)
      : undefined;

  if (exportPath !== undefined) {
    // Create the file up front, like hyperfine: an unwritable path must not
    // cost a full benchmark either.
    writeFileSync(exportPath, "");
  }

  await ensureScenarioInitialized(
    e2eCloneDirectory,
    scenarioPath,
    useLocal,
    forceCheckout,
    forcePublish,
    init,
  );

  if (precompile) {
    logStep("Precompiling (npx hardhat compile)");
    await e2eExec(
      e2eCloneDirectory,
      scenarioPath,
      "npx hardhat compile",
      useLocal,
      forceCheckout,
      forcePublish,
    );
  }

  logStep("Running benchmark");
  log(`Benchmarking: ${fmt.pkg(benchCommand)}`);
  log(`Warmup: ${warmup}, Runs: ${runs}`);

  if (peakRssMethod !== undefined) {
    log(`Peak RSS method: ${PEAK_RSS_METHOD_NAMES[peakRssMethod]}`);
  }

  const scenarioTmpDir = path.join(tmpdir(), "hardhat-bench", scenario.id);
  mkdirSync(scenarioTmpDir, { recursive: true });

  const measured = await runSeries(
    benchCommand,
    reportPathsIn(scenarioTmpDir, "bench"),
    {
      cwd: scenario.workingDir,
      env: scenario.definition.env,
      peakRssMethod,
      runs,
      warmup,
      prepare,
      ignoreFailure,
      showOutput,
      onWarmupCompleted: (i) => log(`  warmup ${i + 1}/${warmup}`),
      onRunCompleted: (run, i) =>
        log(`  run ${i + 1}/${runs}: ${seconds(run.wallSeconds)}`),
    },
  );

  const summary = summarize(measured);

  report(measured, summary, peakRssMethod);

  if (exportPath !== undefined) {
    writeFileSync(exportPath, buildExport(benchCommand, measured, summary));
    log(`Report written to ${exportPath}`);
  }

  log(fmt.success("Benchmark complete"));
}

function seconds(s: number): string {
  return `${s.toFixed(3)} s`;
}

function megabytes(mb: number): string {
  return `${mb.toFixed(1)} MB`;
}

function report(
  measured: MeasuredRun[],
  { wall, userMean, systemMean }: RunSummary,
  peakRssMethod: PeakRssMethod | undefined,
): void {
  log(`  Time (mean ± σ):     ${seconds(wall.mean)} ± ${seconds(wall.stddev)}`);
  log(
    `  Range (min … max):   ${seconds(wall.min)} … ${seconds(wall.max)}  (${measured.length} runs)`,
  );
  log(`  CPU (user, system):  ${seconds(userMean)}, ${seconds(systemMean)}`);

  const peaks = measured
    .map((r) => r.peakRssMb)
    .filter((peak) => peak !== undefined);

  if (peaks.length === measured.length) {
    const rss = computeStats(peaks);
    log(
      `  Peak RSS (mean ± σ): ${megabytes(rss.mean)} ± ${megabytes(rss.stddev)}`,
    );
  } else if (peakRssMethod !== undefined) {
    logWarning(
      `peak RSS missing for ${measured.length - peaks.length} of ${measured.length} runs`,
    );
  }
}

async function cliMain(): Promise<void> {
  let benchArgs: BenchArgs | undefined;

  try {
    benchArgs = resolveAndValidateArgs(process.argv.slice(2));

    if (benchArgs === undefined) {
      console.log(USAGE);
      return;
    }

    await runBenchmark(benchArgs);
  } catch (error) {
    if (!(error instanceof Error)) {
      throw error;
    }

    logError(failureMessage(error, benchArgs));
    process.exit(1);
  }
}

/**
 * For a CommandFailedError, the message gains its captured output and only
 * the applicable rerun hints. `error.command` is set when prepare failed
 * rather than the benchmarked command; --ignore-failure cannot help there.
 * A hint is also dropped when its flag is already set.
 */
function failureMessage(
  error: Error,
  benchArgs: BenchArgs | undefined,
): string {
  if (!(error instanceof CommandFailedError)) {
    return error.message;
  }

  const output = formatOutput({ stdout: error.stdout, stderr: error.stderr });
  const message = error.message + (output === "" ? "" : `\n${output}`);

  if (error.command !== undefined) {
    return `${message}\n  Failing command: ${error.command}`;
  }

  const hints = [
    ...(benchArgs?.showOutput === true
      ? []
      : ["--show-output to stream the command's output"]),
    ...(benchArgs?.ignoreFailure === true
      ? []
      : ["--ignore-failure to tolerate non-zero exit codes"]),
  ];

  if (hints.length === 0) {
    return message;
  }

  return `${message}\n  Rerun with ${hints.join(", or\n  ")}.`;
}

if (import.meta.main) {
  await cliMain();
}
