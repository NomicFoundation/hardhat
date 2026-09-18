import { log } from "./log.ts";

export const DEFAULT_ACCEPTANCE_DIR = "/tmp/acceptance";

export interface AcceptanceArgs {
  runFlag: boolean;
  validateFlag: boolean;
  acceptanceDirectory: string;
  scenario: string | undefined;
  noGitChecks: boolean;
  forcePublishAll: boolean;
}

/**
 * Parse the command line.
 *
 * The working root follows `scripts/end-to-end`: an explicit flag, then the
 * environment, then a default, logging a line when it lands on the default so
 * a stray `/tmp` directory is never a surprise.
 */
export function resolveAndValidateArgs(args: string[]): AcceptanceArgs {
  const runFlag = args.includes("run");
  const validateFlag = args.includes("validate");

  const scenario = getArgValue(args, "--scenario");

  const forcePublishAll = args.includes("--force-publish-all");

  // Force-publishing exists for a working tree with edits in it, so requiring
  // a clean one would defeat it.
  const noGitChecks = args.includes("--no-git-checks") || forcePublishAll;

  let acceptanceDirectory =
    getArgValue(args, "--acceptance-dir") ?? process.env.ACCEPTANCE_DIR;

  if (runFlag && validateFlag) {
    throw new Error("Only one command can be set, either: run or validate");
  }

  if (acceptanceDirectory === undefined) {
    acceptanceDirectory = DEFAULT_ACCEPTANCE_DIR;

    if (runFlag) {
      log(
        "No --acceptance-dir argument or ACCEPTANCE_DIR environment variable provided, defaulting to:",
      );
      log(`  ${DEFAULT_ACCEPTANCE_DIR}`);
    }
  }

  return {
    runFlag,
    validateFlag,
    acceptanceDirectory,
    scenario,
    noGitChecks,
    forcePublishAll,
  };
}

export function getArgValue(args: string[], flag: string): string | undefined {
  const idx = args.indexOf(flag);

  return idx !== -1 && idx + 1 < args.length ? args[idx + 1] : undefined;
}
