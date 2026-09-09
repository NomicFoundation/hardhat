import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { init as e2eInit } from "../end-to-end/subcommands/init.ts";
import { exec as e2eExec } from "../end-to-end/subcommands/exec.ts";
import { loadScenario } from "../end-to-end/helpers/directory.ts";
import { resolveAndValidateArgs, type BenchArgs } from "./helpers/args.ts";
import { fmt, log, logStep, logError, logWarning } from "./helpers/log.ts";
import { computeStats, mean } from "./helpers/stats.ts";
import {
  CommandFailedError,
  formatOutput,
  reportPathsIn,
  runSeries,
  type MeasuredRun,
} from "./helpers/runner.ts";
import {
  resolvePeakRssMethod,
  type PeakRssMethod,
} from "./helpers/peak-rss.ts";

const DEFAULT_RUNS = 10;

const USAGE = `
scripts/benchmark/main.ts — Benchmark Hardhat scenarios

DESCRIPTION
  Initializes an e2e scenario and benchmarks a command, reporting each
  run's wall-clock time, CPU time and peak memory (RSS). Timings exclude
  the shell's own start-up cost. Peak memory needs GNU time or Linux
  /proc; without either (e.g. macOS) it is skipped with a warning.
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
  --prepare <cmd>       Execute CMD unmeasured before each timing run (warmup
                        runs included). Useful for clearing disk caches or
                        resetting state between runs
  --warmup <n>          Unmeasured warmup runs before benchmarking (default: 0).
                        Useful for filling disk caches for I/O-heavy programs
  --runs <n>            Number of benchmark runs (default: ${DEFAULT_RUNS})
  --ignore-failure      Ignore non-zero exit codes of the benchmarked command
  --show-output         Print stdout and stderr of the benchmarked command
  --export-json <path>  Write a JSON report to PATH: per-run times with their
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

  if (init || !existsSync(scenario.workingDir)) {
    logStep("Initializing scenario");
    await e2eInit(
      e2eCloneDirectory,
      scenarioPath,
      useLocal,
      forceCheckout,
      forcePublish,
    );
  }

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

  const peakRssMethod = resolvePeakRssMethod(undefined);

  logStep("Running benchmark");
  log(`Benchmarking: ${fmt.pkg(benchCommand)}`);
  log(`Warmup: ${warmup}, Runs: ${runs}`);

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

  report(measured, peakRssMethod);

  if (exportJson !== undefined) {
    writeFileSync(exportJson, buildExport(benchCommand, measured));
    log(`Report written to ${exportJson}`);
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
  peakRssMethod: PeakRssMethod | undefined,
): void {
  const stats = computeStats(measured.map((r) => r.wallSeconds));

  log(`  Time (mean ± σ):   ${seconds(stats.mean)} ± ${seconds(stats.stddev)}`);
  log(
    `  Range (min … max): ${seconds(stats.min)} … ${seconds(stats.max)}  (${measured.length} runs)`,
  );
  log(
    `  CPU (user, system): ${seconds(mean(measured.map((r) => r.user)))}, ${seconds(mean(measured.map((r) => r.system)))}`,
  );

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

/**
 * Render the report in hyperfine's --export-json shape ({ results: [{ times,
 * mean, stddev, min, max, median, user, system }] }), extended with
 * `peakRssMb`: the i-th run's largest-single-process peak (null when
 * unmeasured).
 */
function buildExport(command: string, measured: MeasuredRun[]): string {
  const stats = computeStats(measured.map((r) => r.wallSeconds));

  return JSON.stringify(
    {
      results: [
        {
          command,
          mean: stats.mean,
          stddev: stats.stddev,
          median: stats.median,
          user: mean(measured.map((r) => r.user)),
          system: mean(measured.map((r) => r.system)),
          min: stats.min,
          max: stats.max,
          times: stats.times,
          peakRssMb: measured.map((r) => r.peakRssMb ?? null),
        },
      ],
    },
    null,
    2,
  );
}

async function cliMain(): Promise<void> {
  const benchArgs = resolveAndValidateArgs(process.argv.slice(2));

  if (benchArgs === undefined) {
    console.log(USAGE);
    return;
  }

  try {
    await runBenchmark(benchArgs);
  } catch (error) {
    if (!(error instanceof Error)) {
      throw error;
    }

    let message = error.message;

    if (error instanceof CommandFailedError) {
      const output = formatOutput({
        stdout: error.stdout,
        stderr: error.stderr,
      });

      message +=
        (output === "" ? "" : `\n${output}`) +
        "\n  Rerun with --show-output to stream the command's output, or" +
        "\n  --ignore-failure to tolerate non-zero exit codes.";
    }

    logError(message);
    process.exit(1);
  }
}

if (import.meta.main) {
  await cliMain();
}
