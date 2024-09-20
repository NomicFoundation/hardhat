import { HardhatError } from "@ignored/hardhat-vnext-errors";

import { createProject, CreateProjectOptions } from "./project-creation.js";

export interface InitHardhatOptions {
  project?: CreateProjectOptions;
}

export async function initHardhat(options?: InitHardhatOptions): Promise<void> {
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
