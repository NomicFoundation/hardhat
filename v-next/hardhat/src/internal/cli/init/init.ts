import { HardhatError } from "@ignored/hardhat-vnext-errors";

import { findClosestHardhatConfig } from "../../config-loading.js";

import { createProject } from "./project-creation.js";

export interface InitHardhatOptions {
  createEmptyTypescriptHardhatConfig?: boolean;
}

export async function initHardhat(options?: InitHardhatOptions): Promise<void> {
  await throwIfCwdAlreadyInsideProject();

  if (
    process.stdout.isTTY === true ||
    options?.createEmptyTypescriptHardhatConfig === true
  ) {
    await createProject({
      createEmptyTypescriptHardhatConfig:
        options?.createEmptyTypescriptHardhatConfig,
    });
    return;
  }

  // Many terminal emulators in windows fail to run the createProject()
  // workflow, and don't present themselves as TTYs. If we are in this
  // situation we throw a special error instructing the user to use WSL or
  // powershell to initialize the project.
  if (process.platform === "win32") {
    throw new HardhatError(
      HardhatError.ERRORS.GENERAL.NOT_INSIDE_PROJECT_ON_WINDOWS,
    );
  }

  throw new HardhatError(HardhatError.ERRORS.GENERAL.NOT_IN_INTERACTIVE_SHELL);
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
