import { HardhatError } from "@ignored/hardhat-vnext-errors";

import { createProject } from "./project-creation.js";
import { getUserConfigPath, isCwdInsideProject } from "./project-structure.js";

export async function initHardhat() {
  if (await isCwdInsideProject()) {
    throw new HardhatError(
      HardhatError.ERRORS.GENERAL.HARDHAT_PROJECT_ALREADY_CREATED,
      {
        hardhatProjectRootPath: await getUserConfigPath(),
      },
    );
  }

  if (
    process.stdout.isTTY === true ||
    process.env.HARDHAT_CREATE_EMPTY_TYPESCRIPT_HARDHAT_CONFIG !== undefined
  ) {
    await createProject();
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
