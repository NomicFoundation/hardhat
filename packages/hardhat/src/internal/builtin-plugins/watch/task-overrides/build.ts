import type { TaskOverrideActionFunction } from "../../../../types/tasks.js";

interface WatchBuildArguments {
  watch: boolean;
  watchDelay: number;
  noRestart: boolean;
}

const watchBuild: TaskOverrideActionFunction<WatchBuildArguments> = async (
  args,
  hre,
  runSuper,
) => {
  if (!args.watch) {
    return await runSuper(args);
  }

  const { runWatchMode } = await import("../watch-mode.js");

  return await runWatchMode({
    hre,
    task: "build",
    watchDelay: args.watchDelay,
    noRestart: args.noRestart,
    selectTestFiles: false,
  });
};

export default watchBuild;
