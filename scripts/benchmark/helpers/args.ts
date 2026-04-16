import { log } from "node:console";
import { normalizeScenarioPath } from "../../end-to-end/helpers/directory.ts";
import { DEFAULT_CLONE_DIR } from "../../end-to-end/helpers/args.ts";

export interface BenchArgs {
  scenarioPath: string;
  command: string | undefined;
  useLocal: boolean;
  forcePublish: boolean;
  precompile: boolean;
  prepare: string | undefined;
  ignoreFailure: boolean;
  showOutput: boolean;
  warmup: number;
  runs: number | undefined;
  e2eCloneDirectory: string;
}

export function resolveAndValidateArgs(args: string[]): BenchArgs | undefined {
  const scenarioPathRaw =
    getArgValue(args, "--scenario") ?? process.env.E2E_SCENARIO;

  if (scenarioPathRaw === undefined) {
    return undefined;
  }

  const scenarioPath = normalizeScenarioPath(scenarioPathRaw);
  const command = getArgValue(args, "--command");
  const useLocal = args.includes("--use-local");
  const forcePublish = args.includes("--force-publish");
  const precompile = args.includes("--precompile");
  const prepare = getArgValue(args, "--prepare");
  const ignoreFailure = args.includes("--ignore-failure");
  const showOutput = args.includes("--show-output");

  const warmupRaw = getArgValue(args, "--warmup");
  const warmup = warmupRaw !== undefined ? parseInt(warmupRaw, 10) : 0;

  if (warmupRaw !== undefined && (isNaN(warmup) || warmup < 0)) {
    throw new Error("--warmup must be a non-negative integer");
  }

  const runsRaw = getArgValue(args, "--runs");
  const runs = runsRaw !== undefined ? parseInt(runsRaw, 10) : undefined;

  if (
    runsRaw !== undefined &&
    (runs === undefined || isNaN(runs) || runs < 1)
  ) {
    throw new Error("--runs must be a positive integer");
  }

  let e2eCloneDirectory =
    getArgValue(args, "--e2e-clone-dir") ?? process.env.E2E_CLONE_DIR;

  if (e2eCloneDirectory === undefined) {
    e2eCloneDirectory = DEFAULT_CLONE_DIR;

    log(
      `No --e2e-clone-dir argument or E2E_CLONE_DIR environment variable provided, defaulting to:`,
    );
    log(`  ${DEFAULT_CLONE_DIR}`);
  }

  return {
    scenarioPath,
    command,
    useLocal,
    forcePublish,
    precompile,
    prepare,
    ignoreFailure,
    showOutput,
    warmup,
    runs,
    e2eCloneDirectory,
  };
}

function getArgValue(args: string[], flag: string): string | undefined {
  const idx = args.indexOf(flag);

  return idx !== -1 && idx + 1 < args.length ? args[idx + 1] : undefined;
}
