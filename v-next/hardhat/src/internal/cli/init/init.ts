import { HardhatError } from "@ignored/hardhat-vnext-errors";

import { findClosestHardhatConfig } from "../../config-loading.js";

import { createProject, CreateProjectOptions } from "./project-creation.js";

export interface InitHardhatOptions {
  project?: CreateProjectOptions;
}

export async function initHardhat(options?: InitHardhatOptions): Promise<void> {
  await throwIfCwdAlreadyInsideProject();

  // Project initialization in a non-interactive shell is currently not supported
  if (process.stdout.isTTY !== true) {
    // Many terminal emulators in windows don't present themselves as TTYs.
    // If we are in this situation we throw a special error instructing the user
    // to use WSL or powershell to initialize the project.
    if (process.platform === "win32") {
      throw new HardhatError(
        HardhatError.ERRORS.GENERAL.NOT_INSIDE_PROJECT_ON_WINDOWS,
      );
    }
    throw new HardhatError(
      HardhatError.ERRORS.GENERAL.NOT_IN_INTERACTIVE_SHELL,
    );
  }

  await createProject(options?.project);
}

async function throwIfCwdAlreadyInsideProject() {
  try {
    const configFilePath = await findClosestHardhatConfig();

    throw new HardhatError(
      HardhatError.ERRORS.GENERAL.HARDHAT_PROJECT_ALREADY_CREATED,
      {
        hardhatProjectRootPath: configFilePath,
      },
    );
  } catch (err) {
    if (
      HardhatError.isHardhatError(err) &&
      err.number === HardhatError.ERRORS.GENERAL.NO_CONFIG_FILE_FOUND.number
    ) {
      // If a configuration file is not found, it is possible to initialize a new project,
      // hence continuing code execution
      return;
    }

    throw err;
  }
}
