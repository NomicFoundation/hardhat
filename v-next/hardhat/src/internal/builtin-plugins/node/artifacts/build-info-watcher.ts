import path from "node:path";

import { exists, getFileSize } from "@nomicfoundation/hardhat-utils/fs";
import { watch, type FSWatcher } from "chokidar";
import debug from "debug";

import { sendErrorTelemetry } from "../../../cli/telemetry/sentry/reporter.js";

const log = debug("hardhat:core:tasks:node:artifacts");

/**
 * `BuildInfoWatcher` is a class that continuously monitors a specified directory
 * for changes related to build info files. It listens for the addition of new build
 * info or build info output files and manages the checking process to ensure all
 * write operations for a given build are complete.
 *
 * Once both the build info and associated output files for a build id have been
 * fully written, the watcher triggers registered listeners, passing the build id
 * as an argument. This allows for further processing or actions to be taken
 * upon completion of a build.
 *
 * The class provides mechanisms to add listeners that react to build completion
 * and manage ongoing or in-progress builds using a map, ensuring no overlapping
 * operations occur for the same build id.
 */
export class BuildInfoWatcher {
  readonly #buildInfoDirPath: string;
  readonly #watcher: FSWatcher;

  readonly #inProgressBuilds: Map<string, Promise<void>> = new Map();
  readonly #listeners: Array<(buildId: string) => void> = [];
  readonly #stabilityThreshold: number = 250;
  readonly #pollInterval: number = 50;

  constructor(buildInfoDirPath: string) {
    this.#buildInfoDirPath = buildInfoDirPath;

    // NOTE: Deleting the build info directory while it is being watched will
    // effectively cause the watcher to stop working.
    // NOTE: We don't use chokidar's `awaitWriteFinish` option because we need to
    // await writes to both the build info and the build info output to finish.
    this.#watcher = watch(this.#buildInfoDirPath, {
      ignoreInitial: true,
    });

    // NOTE: We listen only to the "add" event because the contents of the build info
    // files identified by a build id should be considered immutable under usual circumstances.
    this.#watcher.on("add", this.listener.bind(this));
  }

  #getBuildInfoId(absolutePath: string): string {
    const buildId = path
      .basename(absolutePath)
      .replace(".output.json", "")
      .replace(".json", "");

    return buildId;
  }

  #getBuildInfoPath(buildId: string): string {
    return path.join(this.#buildInfoDirPath, `${buildId}.json`);
  }

  #getBuildInfoOutputPath(buildId: string): string {
    return path.join(this.#buildInfoDirPath, `${buildId}.output.json`);
  }

  /**
   * `waitUntilBuildFinished` waits until the build info and build info output
   * files associated with a given build id have been completely written to disk.
   *
   * It monitors the file sizes and waits until they remain unchanged for a specified
   * stability threshold. Once the writes are confirmed as finished, it resolves.
   *
   * This function is used internally to ensure that file writes have completed
   * before any further processing is done.
   *
   * @param buildId - The unique identifier for the build whose completion is being awaited.
   *
   * This function is exposed for testing purposes only.
   */
  public async waitUntilBuildFinished(buildId: string): Promise<void> {
    log(`Awaiting write finish for build ${buildId}`);

    const buildInfoPath = this.#getBuildInfoPath(buildId);
    const buildInfoOutputPath = this.#getBuildInfoOutputPath(buildId);

    let timeSinceLastBuildInfoSizeChange = 0;

    let lastBuildInfoSizeChangeDate = new Date();
    let lastBuildInfoSize = 0;
    let lastBuildInfoOutputSize = 0;

    while (true) {
      const date = new Date();

      const buildInfoSize = await getFileSize(buildInfoPath);
      const buildInfoOutputSize = await getFileSize(buildInfoOutputPath);

      if (
        lastBuildInfoSize !== buildInfoSize ||
        lastBuildInfoOutputSize !== buildInfoOutputSize
      ) {
        lastBuildInfoSizeChangeDate = date;
      }

      lastBuildInfoSize = buildInfoSize;
      lastBuildInfoOutputSize = buildInfoOutputSize;

      timeSinceLastBuildInfoSizeChange =
        date.getTime() - lastBuildInfoSizeChangeDate.getTime();

      if (timeSinceLastBuildInfoSizeChange >= this.#stabilityThreshold) {
        log(`Build info for build ${buildId} has been fully written to disk`);
        break;
      } else {
        log(`Build info for build ${buildId} is not yet fully written to disk`);
        await new Promise((resolve) => setTimeout(resolve, this.#pollInterval));
      }
    }

    await Promise.all(this.#listeners.map((listener) => listener(buildId)));
  }

  /**
   * `listener` is a callback function invoked when a new file is added to the
   * build info directory. It processes the file to determine the build id and
   * checks if both the build info and build info output files associated with
   * that build id exist.
   *
   * If both files are present and the build for that build id is not currently
   * being awaited, it starts the process of monitoring the file writes to ensure
   * they complete successfully.
   *
   * Upon completion of the build, all registered listeners are executed with the
   * build id. Any errors encountered during the monitoring or listener execution
   * are logged and reported to Sentry.
   *
   * @param absolutePath - The absolute path of the file added to the build info directory.
   *
   * This function is exposed for testing purposes only.
   */
  public async listener(absolutePath: string): Promise<void> {
    log(`Detected change in ${absolutePath}`);

    const buildId = this.#getBuildInfoId(absolutePath);
    const buildInfoPath = this.#getBuildInfoPath(buildId);
    const buildInfoOutputPath = this.#getBuildInfoOutputPath(buildId);

    if (!(await exists(buildInfoPath))) {
      log(`Build info file for build ${buildId} not found`);
      return;
    }

    if (!(await exists(buildInfoOutputPath))) {
      log(`Build info output file for build ${buildId} not found`);
      return;
    }

    if (this.#inProgressBuilds.has(buildId)) {
      log(`Build info for build ${buildId} already being awaited`);
      return;
    }

    this.#inProgressBuilds.set(
      buildId,
      this.waitUntilBuildFinished(buildId)
        .catch(async (error: unknown) => {
          log(
            `Error while awaiting write finish for build ${buildId}\n`,
            error,
          );

          if (error instanceof Error) {
            await sendErrorTelemetry(error);
          }
        })
        .then(async () => {
          await Promise.all(
            this.#listeners.map((listener) => listener(buildId)),
          );
        })
        .catch(async (error: unknown) => {
          log(`Error while calling listeners for build ${buildId}\n`, error);

          if (error instanceof Error) {
            await sendErrorTelemetry(error);
          }
        })
        .finally(() => this.#inProgressBuilds.delete(buildId)),
    );
  }

  public addListener(listener: (buildId: string) => Promise<void>): this {
    this.#listeners.push(listener);
    return this;
  }

  public async waitUntilClosed(): Promise<void> {
    await this.#watcher.close();
    await Promise.all(this.#inProgressBuilds.values());
  }
}
