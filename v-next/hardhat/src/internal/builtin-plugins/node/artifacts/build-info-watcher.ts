import type { FSWatcher } from "chokidar";

import path from "node:path";

import debug from "debug";

export type BuildInfoWatcher = FSWatcher;
export type BuildInfoHandler = (buildId: string) => Promise<void>;

const log = debug("hardhat:core:tasks:node:artifacts");

const STABILITY_THRESHOLD = 250;
const POLL_INTERVAL = 50;

/**
 * `listener` is a callback function invoked when a new file is added to the
 * build info directory. It processes the received event to check whether it is
 * for a build info file.
 *
 * If so, it extracts the build id from it and triggers the provided handler
 * with the extracted build id as an argument. Any errors encountered during
 * handler execution are captured and logged.
 *
 * @param absolutePath - The absolute path of the file added to the build info directory.
 *
 * This function is exposed for testing purposes only.
 */
export async function listener(
  handler: BuildInfoHandler,
  absolutePath: string,
): Promise<void> {
  log(`Detected change in ${absolutePath}`);

  const isBuildInfoFile =
    absolutePath.endsWith(".json") && !absolutePath.endsWith(".output.json");

  if (!isBuildInfoFile) {
    log(`File ${absolutePath} is not a build info file`);
    return;
  }

  const buildId = path.basename(absolutePath).replace(".json", "");

  await handler(buildId).catch(async (error: unknown) => {
    log(
      `There was a problem executing the handler for build ${buildId}.`,
      error,
    );
  });
}

/**
 * `watchBuildInfo` is a function that creates a watch over provided build info
 * directory. If it encounters a build info file being added, it will trigger
 * the provided handler, passing the build id as an argument. This allows for
 * further processing or actions to be taken upon completion of a build.
 */
export async function watchBuildInfo(
  buildInfoDirPath: string,
  handler: BuildInfoHandler,
): Promise<BuildInfoWatcher> {
  const { watch } = await import("chokidar");

  // NOTE: Deleting the build info directory while it is being watched will
  // effectively cause the watcher to stop working.
  // NOTE: We use chokidar's `awaitWriteFinish` option because we are certain
  // the build info file will be added after the build info output file.
  const watcher = watch(buildInfoDirPath, {
    persistent: true,
    ignoreInitial: true,
    awaitWriteFinish: {
      stabilityThreshold: STABILITY_THRESHOLD,
      pollInterval: POLL_INTERVAL,
    },
  });

  // NOTE: We listen only to the "add" event because the contents of the build info
  // files identified by a build id should be considered immutable under usual circumstances.
  watcher.on("add", listener.bind(null, handler));

  return watcher;
}
