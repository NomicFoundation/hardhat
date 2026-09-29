import {
  normalizeScenarioPath,
  resolveInvocationPath,
} from "../../end-to-end/helpers/directory.ts";
import {
  assertOnlyFlags,
  CLONE_DIR_FLAG,
  getArgValue,
  givenCloneDirectory,
  isHelpRequested,
  logCloneDirectoryDefault,
  resolveCloneDirectory,
} from "../../end-to-end/helpers/args.ts";
import {
  ForceCheckout,
  ForcePublish,
  UseLocal,
} from "../../end-to-end/subcommands/init.ts";
import {
  parsePeakRssMethod,
  PEAK_RSS_FLAG,
  type PeakRssMethod,
} from "./peak-rss.ts";

export interface BenchArgs {
  scenarioPath: string;
  command: string | undefined;
  init: boolean;
  useLocal: UseLocal;
  forceCheckout: ForceCheckout;
  forcePublish: ForcePublish;
  precompile: boolean;
  prepare: string | undefined;
  ignoreFailure: boolean;
  showOutput: boolean;
  /**
   * Explicit `--peak-rss` choice; undefined lets `resolvePeakRssMethod`
   * auto-select.
   */
  peakRssMethod: PeakRssMethod | undefined;
  warmup: number;
  runs: number | undefined;
  exportJson: string | undefined;
  e2eCloneDirectory: string;
}

export function resolveAndValidateArgs(args: string[]): BenchArgs | undefined {
  if (isHelpRequested(args)) {
    return undefined;
  }

  const valueFlags = [
    "--scenario",
    "--command",
    "--prepare",
    "--warmup",
    "--runs",
    "--export-json",
    PEAK_RSS_FLAG,
    CLONE_DIR_FLAG,
  ];
  const booleanFlags = [
    "--init",
    "--use-local",
    "--force-checkout",
    "--force-publish",
    "--precompile",
    "--ignore-failure",
    "--show-output",
  ];
  assertOnlyFlags(args, valueFlags, booleanFlags);

  const scenarioPathRaw =
    getArgValue(args, "--scenario") ?? process.env.E2E_SCENARIO;

  if (scenarioPathRaw === undefined) {
    return undefined;
  }

  const scenarioPath = normalizeScenarioPath(scenarioPathRaw);
  const command = getArgValue(args, "--command");
  const init = args.includes("--init");
  const useLocal = args.includes("--use-local") ? UseLocal.Yes : UseLocal.No;

  const forceCheckout = args.includes("--force-checkout")
    ? ForceCheckout.Yes
    : ForceCheckout.No;

  const forcePublish = args.includes("--force-publish")
    ? ForcePublish.Yes
    : ForcePublish.No;

  const precompile = args.includes("--precompile");
  const prepare = getArgValue(args, "--prepare");
  const ignoreFailure = args.includes("--ignore-failure");
  const showOutput = args.includes("--show-output");
  const peakRssMethod = parsePeakRssMethod(args);

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

  const exportJson = resolveInvocationPath(getArgValue(args, "--export-json"));

  const givenCloneDir = givenCloneDirectory(args);

  if (givenCloneDir === undefined) {
    logCloneDirectoryDefault();
  }

  return {
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
    peakRssMethod,
    warmup,
    runs,
    exportJson,
    e2eCloneDirectory: resolveCloneDirectory(givenCloneDir),
  };
}
