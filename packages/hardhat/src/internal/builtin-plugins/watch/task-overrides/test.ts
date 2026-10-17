import type { TaskOverrideActionFunction } from "../../../../types/tasks.js";

export interface WatchTestArguments {
  watch: boolean;
  watchDelay: number;
  noRestart: boolean;
  runAll: boolean;
  // Forwarded from the base `test` task; used to detect a user's own choice of
  // tests.
  testFiles?: string[];
  grep?: string;
  grepExclude?: string;
}

/**
 * Creates the action of a test task override, for `test` or `test solidity`.
 */
export function createWatchTestAction(
  task: "test" | "test solidity",
): TaskOverrideActionFunction<WatchTestArguments> {
  return async (args, hre, runSuper) => {
    if (!args.watch) {
      return await runSuper(args);
    }

    const { runWatchMode } = await import("../watch-mode.js");

    // When the user already chose which tests to run, every rerun keeps that
    // choice instead of narrowing it to the file that changed.
    const userChoseTests =
      (args.testFiles !== undefined && args.testFiles.length > 0) ||
      args.grep !== undefined ||
      args.grepExclude !== undefined;

    return await runWatchMode({
      hre,
      task,
      watchDelay: args.watchDelay,
      noRestart: args.noRestart,
      selectTestFiles: !args.runAll && !userChoseTests,
    });
  };
}

const watchTest: TaskOverrideActionFunction<WatchTestArguments> =
  createWatchTestAction("test");

export default watchTest;
