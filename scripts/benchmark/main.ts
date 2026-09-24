import { mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { exec as e2eExec } from "../end-to-end/subcommands/exec.ts";
import { loadScenario } from "../end-to-end/helpers/directory.ts";
import { ensureScenarioInitialized } from "../end-to-end/helpers/scenario-setup.ts";
import { resolveAndValidateArgs, type BenchArgs } from "./helpers/args.ts";
import { fmt, log, logStep, logError, logWarning } from "./helpers/log.ts";
import { buildExport, summarize } from "./helpers/bench-export.ts";
import { formatRun, runCounter, summaryTable } from "./helpers/report.ts";
import {
  CommandFailedError,
  formatOutput,
  reportPathsIn,
  runSeries,
} from "./helpers/runner.ts";
import {
  PEAK_RSS_METHOD_NAMES,
  resolvePeakRssMethod,
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
                        (warm-up runs included). Useful for clearing disk
                        caches or resetting state between runs
  --warmup <n>          Unmeasured warm-up runs before benchmarking
                        (default: 0). Useful for filling disk caches for
                        I/O-heavy programs
  --runs <n>            Number of measured runs (default: ${DEFAULT_RUNS})
  --ignore-failure      Ignore non-zero exit codes of the benchmarked command
  --show-output         Print stdout and stderr of the benchmarked command
  --peak-rss <method>   Peak-memory method: "gnu-time" or "sampler" (default:
                        GNU time when available, else the sampler). An
                        explicit choice this machine cannot provide fails at
                        startup
  --export-json <path>  Write a JSON report to PATH, resolved against the
                        invoking directory. It holds command, warmupRuns and
                        measuredRuns. wallSeconds, cpuSeconds (with user and
                        system nested) and peakRssMb each hold per-run values
                        in run order with their statistics. peakRssMb is null
                        without a peak-RSS method. Its statistics are null
                        when a run lacks a reading. stddev is null for a
                        single run
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
    // Created now so an export path that cannot be written fails before
    // the benchmark spends minutes running.
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
  const peakRssName =
    peakRssMethod !== undefined
      ? PEAK_RSS_METHOD_NAMES[peakRssMethod]
      : "unmeasured";
  log(
    `Warm-up runs: ${warmup}, measured runs: ${runs}, peak RSS: ${peakRssName}`,
  );

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
      onWarmupCompleted: (i, total) =>
        log(fmt.deemphasize(`  warm-up ${runCounter(i, total)}`)),
      onRunCompleted: (run, i, total) =>
        log(`  run ${runCounter(i, total)}: ${formatRun(run)}`),
    },
  );

  const summary = summarize(measured);

  for (const line of summaryTable(summary, warmup, peakRssMethod)) {
    log(line);
  }

  const missingPeaks = measured.filter((r) => r.peakRssMb === undefined);

  if (peakRssMethod !== undefined && missingPeaks.length > 0) {
    logWarning(
      `peak RSS missing for ${missingPeaks.length} of ${measured.length} ` +
        "runs, so the summary omits its row" +
        (exportPath !== undefined
          ? ", and the export holds only the per-run readings"
          : ""),
    );
  }

  if (exportPath !== undefined) {
    writeFileSync(
      exportPath,
      buildExport(benchCommand, warmup, summary, peakRssMethod),
    );
    log(`Report written to ${exportPath}`);
  }

  log(fmt.success("Benchmark complete"));
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
