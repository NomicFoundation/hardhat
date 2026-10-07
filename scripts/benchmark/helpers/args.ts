import {
  normalizeScenarioPath,
  resolveInvocationPath,
} from "../../end-to-end/helpers/directory.ts";
import {
  givenCloneDirectory,
  logCloneDirectoryDefault,
  resolveCloneDirectory,
} from "../../end-to-end/helpers/args.ts";
import { cliError, parseCliArgs } from "../../lib/cli-args.ts";
import {
  ForceCheckout,
  ForcePublish,
  UseLocal,
} from "../../end-to-end/subcommands/init.ts";
import { parsePeakRssMethod, type PeakRssMethod } from "./peak-rss.ts";

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
  const cli = {
    command: "pnpm bench",
    options: {
      scenario: { type: "string" },
      command: { type: "string" },
      init: { type: "boolean" },
      "use-local": { type: "boolean" },
      "force-checkout": { type: "boolean" },
      "force-publish": { type: "boolean" },
      precompile: { type: "boolean" },
      prepare: { type: "string" },
      warmup: { type: "string" },
      runs: { type: "string" },
      "ignore-failure": { type: "boolean" },
      "show-output": { type: "boolean" },
      "peak-rss": { type: "string" },
      "export-json": { type: "string" },
      "e2e-clone-dir": { type: "string" },
    },
  } as const;
  const parsed = parseCliArgs(args, cli);

  if (parsed === undefined) {
    return undefined;
  }

  const { values } = parsed;
  const scenarioPathRaw = values.scenario ?? process.env.E2E_SCENARIO;

  if (scenarioPathRaw === undefined) {
    throw cliError(cli, "--scenario is required unless E2E_SCENARIO is set");
  }

  const warmupRaw = values.warmup;
  const warmup = warmupRaw !== undefined ? parseInt(warmupRaw, 10) : 0;

  if (warmupRaw !== undefined && (isNaN(warmup) || warmup < 0)) {
    throw cliError(cli, "--warmup must be a non-negative integer");
  }

  const runsRaw = values.runs;
  const runs = runsRaw !== undefined ? parseInt(runsRaw, 10) : undefined;

  if (
    runsRaw !== undefined &&
    (runs === undefined || isNaN(runs) || runs < 1)
  ) {
    throw cliError(cli, "--runs must be a positive integer");
  }

  const givenCloneDir = givenCloneDirectory(values["e2e-clone-dir"]);

  if (givenCloneDir === undefined) {
    logCloneDirectoryDefault();
  }

  return {
    scenarioPath: normalizeScenarioPath(scenarioPathRaw),
    command: values.command,
    init: values.init === true,
    useLocal: values["use-local"] === true ? UseLocal.Yes : UseLocal.No,
    forceCheckout:
      values["force-checkout"] === true ? ForceCheckout.Yes : ForceCheckout.No,
    forcePublish:
      values["force-publish"] === true ? ForcePublish.Yes : ForcePublish.No,
    precompile: values.precompile === true,
    prepare: values.prepare,
    ignoreFailure: values["ignore-failure"] === true,
    showOutput: values["show-output"] === true,
    peakRssMethod: parsePeakRssMethod(values["peak-rss"]),
    warmup,
    runs,
    exportJson: resolveInvocationPath(values["export-json"]),
    e2eCloneDirectory: resolveCloneDirectory(givenCloneDir),
  };
}
