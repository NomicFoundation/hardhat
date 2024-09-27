import path from "node:path";

import { exists } from "@ignored/hardhat-vnext-utils/fs";

type PackageManager = "npm" | "yarn" | "pnpm";

/**
 * getPackageManager returns the name of the package manager used in the workspace.
 * It determines this by checking the presence of package manager specific lock files.
 *
 * @param workspace The path to the workspace to initialize the project in.
 * @returns The name of the package manager used in the workspace.
 */
export async function getPackageManager(
  workspace: string,
): Promise<PackageManager> {
  const pathToYarnLock = path.join(workspace, "yarn.lock");
  const pathToPnpmLock = path.join(workspace, "pnpm-lock.yaml");

  if (await exists(pathToYarnLock)) {
    return "yarn";
  }
  if (await exists(pathToPnpmLock)) {
    return "pnpm";
  }
  return "npm";
}

/**
 * getDevDependenciesInstallationCommand returns the command to install the given dependencies
 * as dev dependencies using the given package manager.
 *
 * @param packageManager The package manager to use.
 * @param dependencies The dependencies to install.
 * @returns The installation command.
 */
export function getDevDependenciesInstallationCommand(
  packageManager: PackageManager,
  dependencies: string[],
): string[] {
  const packageManagerToCommand: Record<PackageManager, string[]> = {
    npm: ["npm", "install", "--save-dev"],
    yarn: ["yarn", "add", "--dev"],
    pnpm: ["pnpm", "add", "--save-dev"],
  };
  const command = packageManagerToCommand[packageManager];
  command.push(...dependencies);
  return command;
}
