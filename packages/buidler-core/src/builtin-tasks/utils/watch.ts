import chalk from "chalk";
import debug from "debug";
import fsExtra from "fs-extra";
import * as path from "path";

import { BUILD_INFO_DIR_NAME } from "../../internal/constants";
import { Reporter } from "../../internal/sentry/reporter";
import { EIP1193Provider, ProjectPaths } from "../../types";

const log = debug("hardhat:core:compilation-watcher");

export async function watchCompilerOutput(
  provider: EIP1193Provider,
  paths: ProjectPaths
) {
  const chokidar = await import("chokidar");

  const buildInfoDir = path.join(paths.artifacts, BUILD_INFO_DIR_NAME);

  const addCompilationResult = async (buildInfo: string) => {
    try {
      log("Adding new compilation result to the node");

      const { input, output, solcVersion } = await fsExtra.readJSON(buildInfo, {
        encoding: "utf8",
      });

      await provider.request({
        method: "buidler_addCompilationResult",
        params: [solcVersion, input, output],
      });
    } catch (error) {
      console.warn(
        chalk.yellow(
          "There was a problem adding the new compiler result. Run Buidler with --verbose to learn more."
        )
      );

      log(
        "Last compilation result couldn't be added. Please report this to help us improve Buidler.\n",
        error
      );

      Reporter.reportError(error);
    }
  };

  log(`Watching changes on '${buildInfoDir}'`);

  chokidar
    .watch(buildInfoDir, {
      ignoreInitial: true,
      awaitWriteFinish: {
        stabilityThreshold: 250,
        pollInterval: 50,
      },
    })
    .on("add", addCompilationResult);
}
