import chalk from "chalk";
import debug from "debug";
import fsExtra from "fs-extra";
import * as path from "path";

import {
  SOLC_INPUT_FILENAME,
  SOLC_OUTPUT_FILENAME,
} from "../../internal/constants";
import { Reporter } from "../../internal/sentry/reporter";
import { EthereumProvider, ProjectPaths, SolcConfig } from "../../types";

const log = debug("buidler:core:compilation-watcher");

export async function watchCompilerOutput(
  provider: EthereumProvider,
  solcConfig: SolcConfig,
  paths: ProjectPaths
) {
  const chokidar = await import("chokidar");

  const compilerVersion = solcConfig.version;
  const solcInputPath = path.join(paths.cache, SOLC_INPUT_FILENAME);
  const solcOutputPath = path.join(paths.cache, SOLC_OUTPUT_FILENAME);

  const addCompilationResult = async () => {
    if (
      !(await fsExtra.pathExists(path.join(paths.cache, SOLC_INPUT_FILENAME)))
    ) {
      return false;
    }

    if (
      !(await fsExtra.pathExists(path.join(paths.cache, SOLC_OUTPUT_FILENAME)))
    ) {
      return false;
    }

    try {
      log("Adding new compilation result to the node");

      const compilerInput = await fsExtra.readJSON(solcInputPath, {
        encoding: "utf8",
      });
      const compilerOutput = await fsExtra.readJSON(solcOutputPath, {
        encoding: "utf8",
      });

      await provider.send("buidler_addCompilationResult", [
        compilerVersion,
        compilerInput,
        compilerOutput,
      ]);
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

  log(`Watching changes on '${solcOutputPath}'`);

  chokidar
    .watch(solcOutputPath, {
      ignoreInitial: true,
      awaitWriteFinish: {
        stabilityThreshold: 250,
        pollInterval: 50,
      },
    })
    .on("add", addCompilationResult)
    .on("change", addCompilationResult);
}
