import { existsSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { init as e2eInit } from "../end-to-end/subcommands/init.ts";
import { exec as e2eExec } from "../end-to-end/subcommands/exec.ts";
import { loadScenario } from "../end-to-end/helpers/directory.ts";
import { resolveAndValidateArgs, type BenchArgs } from "./helpers/args.ts";
import { fmt, log, logStep, logError, logWarning } from "./helpers/log.ts";
import { computeStats, mean } from "./helpers/stats.ts";
import { runSeries, type MeasuredRun } from "./helpers/runner.ts";
import { procSamplingAvailable, toSeriesTable } from "./helpers/mem-series.ts";

const USAGE = `
scripts/benchmark/main.ts — Benchmark Hardhat scenarios

DESCRIPTION
  Initializes an e2e scenario and benchmarks a command: wall-clock time
  (with the shell-spawn overhead measured up-front and subtracted, like
  hyperfine's calibration), CPU time via bash's time builtin, and — on
  Linux — a memory-over-time series sampled from /proc every 100 ms with
  the exact peak of the largest single process (VmHWM).
  Use --use-local to detect changed packages, publish them to Verdaccio,
  and pin the scenario to those versions before benchmarking.

OPTIONS
  --scenario <path>     Scenario folder or scenario.json (required)
  --command <cmd>       Command to benchmark (default: scenario's defaultCommand)
  --init                Force (re-)initialization of the scenario even if it is
                        already set up. Without this flag, an existing scenario
                        setup is reused and only (re-)initialized on demand
  --use-local           Detect packages changed since their release tag, bump
                        versions, publish to Verdaccio, and pin scenario deps to
                        the published versions. If Verdaccio is already running,
                        publish is skipped (the existing registry contents are
                        reused) unless --force-publish is also passed.
                        Only applies when init runs
  --force-checkout      Force git checkouts even if there are uncommitted changes in the scenario working directory
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
  --runs <n>            Number of benchmark runs (default: 10)
  --ignore-failure      Ignore non-zero exit codes of the benchmarked command
  --show-output         Print stdout and stderr of the benchmarked command
  --export-json <path>  Write a hyperfine-compatible JSON report to PATH,
                        extended with each run's memory series
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
  const runs = benchArgs.runs ?? 10;

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

  if (!procSamplingAvailable()) {
    logWarning(
      "/proc is not available — memory will not be " +
        "measured. Memory measurements require Linux.",
    );
  }

  logStep("Running benchmark");
  log(`Benchmarking: ${fmt.pkg(benchCommand)}`);
  log(`Warmup: ${warmup}, Runs: ${runs}`);

  const timingPath = path.join(
    mkdtempSync(path.join(tmpdir(), "hardhat-bench-")),
    "cpu.txt",
  );

  const measured = await runSeries(benchCommand, timingPath, {
    cwd: scenario.workingDir,
    env: scenario.definition.env,
    runs,
    warmup,
    prepare,
    ignoreFailure,
    showOutput,
  });

  report(measured);

  if (exportJson !== undefined) {
    writeFileSync(exportJson, buildExport(benchCommand, measured));
    log(`Report written to ${exportJson}`);
  }

  log(fmt.success("Benchmark complete"));
}

function report(measured: MeasuredRun[]): void {
  const stats = computeStats(measured.map((r) => r.wallSeconds));
  const seconds = (s: number) => `${s.toFixed(3)} s`;

  log(`  Time (mean ± σ):   ${seconds(stats.mean)} ± ${seconds(stats.stddev)}`);
  log(
    `  Range (min … max): ${seconds(stats.min)} … ${seconds(stats.max)}  (${measured.length} runs)`,
  );
  log(
    `  CPU (user, system): ${seconds(mean(measured.map((r) => r.user)))}, ${seconds(mean(measured.map((r) => r.system)))}`,
  );

  const peaks = measured
    .map((r) => r.memory?.maxProcessRssMb)
    .filter((peak) => peak !== undefined);

  if (peaks.length === measured.length) {
    log(`  Max process RSS:   ${Math.max(...peaks)} MB`);
  }
}

/**
 * Render the report in hyperfine's --export-json shape ({ results: [{ times,
 * mean, stddev, min, max, median, user, system }] }) so downstream consumers
 * keep working, extended with each run's memory series (`memory[i]` holds the
 * i-th run's exact largest-single-process peak and its per-process series
 * over a shared time axis).
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
          memory: measured.map((r) =>
            r.memory !== undefined
              ? {
                  maxProcessRssMb: r.memory.maxProcessRssMb,
                  ...toSeriesTable(r.memory.samples),
                }
              : null,
          ),
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

    logError(error.message);
    process.exit(1);
  }
}

if (import.meta.main) {
  await cliMain();
}
