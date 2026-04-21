import { pathToFileURL } from "node:url";
import { init as e2eInit } from "../end-to-end/subcommands/init.ts";
import { exec as e2eExec } from "../end-to-end/subcommands/exec.ts";
import { loadScenario } from "../end-to-end/helpers/directory.ts";
import { resolveAndValidateArgs, type BenchArgs } from "./helpers/args.ts";
import { fmt, log, logStep, logError, logWarning } from "./helpers/log.ts";

const USAGE = `
scripts/benchmark/main.ts — Benchmark Hardhat scenarios with hyperfine

DESCRIPTION
  Initializes an e2e scenario and benchmarks a command using hyperfine.
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
                        the published versions. Only applies when init runs
  --force-publish       Allow publishing to an already-running Verdaccio instance.
                        Only applies when init runs
  --precompile          Run "npx hardhat compile" in the scenario before
                        benchmarking (useful for warming up compilation caches)
  --prepare <cmd>       Execute CMD before each timing run. Forwarded to
                        hyperfine's --prepare flag. Useful for clearing disk
                        caches or resetting state between runs
  --warmup <n>          Warmup runs before benchmarking (default: 0). Forwarded
                        to hyperfine's --warmup flag. Useful for filling disk
                        caches for I/O-heavy programs
  --runs <n>            Number of benchmark runs (default: scenario's
                        benchmark.runs.defaultCommand or 10). Forwarded to
                        hyperfine's --runs flag
  --ignore-failure      Ignore non-zero exit codes of the benchmarked command.
                        Forwarded to hyperfine's --ignore-failure flag
  --show-output         Print stdout and stderr of the benchmarked command.
                        Forwarded to hyperfine's --show-output flag
  --export-json <path>  Write hyperfine's JSON report to PATH. Forwarded to
                        hyperfine's --export-json flag
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
  const runs =
    benchArgs.runs ?? scenario.definition.benchmark?.runs?.defaultCommand ?? 10;

  if (init) {
    logStep("Initializing scenario");
    await e2eInit(e2eCloneDirectory, scenarioPath, useLocal, forcePublish);
  }

  if (precompile) {
    logStep("Precompiling (npx hardhat compile)");
    await e2eExec(
      e2eCloneDirectory,
      scenarioPath,
      "npx hardhat compile",
      useLocal,
      forcePublish,
    );
  }

  logStep("Running benchmark");
  const hyperfineCommand = buildHyperfineCommand(
    benchCommand,
    warmup,
    runs,
    prepare,
    ignoreFailure,
    showOutput,
    exportJson,
  );

  log(`Benchmarking: ${fmt.pkg(benchCommand)}`);
  log(`Warmup: ${warmup}, Runs: ${runs}`);

  await e2eExec(
    e2eCloneDirectory,
    scenarioPath,
    hyperfineCommand,
    useLocal,
    forcePublish,
  );

  log(fmt.success("Benchmark complete"));
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

function buildHyperfineCommand(
  command: string,
  warmup: number,
  runs: number,
  prepare: string | undefined,
  ignoreFailure: boolean,
  showOutput: boolean,
  exportJson: string | undefined,
): string {
  const parts: string[] = ["hyperfine"];

  if (warmup > 0) {
    parts.push("--warmup", String(warmup));
  }

  parts.push("--runs", String(runs));

  if (prepare !== undefined) {
    parts.push("--prepare", `'${prepare}'`);
  }

  if (ignoreFailure) {
    parts.push("--ignore-failure");
  }

  if (showOutput) {
    parts.push("--show-output");
  }

  if (exportJson !== undefined) {
    parts.push("--export-json", `'${exportJson}'`);
  }

  parts.push(`'${command}'`);

  return parts.join(" ");
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  await cliMain();
}
