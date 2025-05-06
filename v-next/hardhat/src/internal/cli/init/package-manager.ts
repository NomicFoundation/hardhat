import { execSync } from "node:child_process";
import path from "node:path";

import { exists } from "@nomicfoundation/hardhat-utils/fs";
import semver from "semver";

type PackageManager = "npm" | "yarn" | "pnpm";

/**
 * getPackageManager returns the name of the package manager used in the workspace.
 * It determines this by checking the presence of package manager specific lock files.
 *
 * @param workspace The path to the workspace where the package manager should be checked.
 * @returns The name of the package manager used in the workspace.
 */
export async function getPackageManager(
  workspace: string,
): Promise<PackageManager> {
  const pathToYarnLock = path.join(workspace, "yarn.lock");
  const pathToPnpmLock = path.join(workspace, "pnpm-lock.yaml");

  const invokedFromPnpm = (process.env.npm_config_user_agent ?? "").includes(
    "pnpm",
  );

  if (await exists(pathToYarnLock)) {
    return "yarn";
  }
  if ((await exists(pathToPnpmLock)) || invokedFromPnpm) {
    return "pnpm";
  }
  return "npm";
}

/**
 * getDevDependenciesInstallationCommand returns the command to install the given dependencies
 * as dev dependencies using the given package manager. The returned command should
 * be safe to run on the command line.
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
  // We quote all the dependency identifiers so that they can be run on a shell
  // without semver symbols interfering with the command
  command.push(...dependencies.map((d) => `"${d}"`));
  return command;
}

/**
 * installsPeerDependenciesByDefault returns true if the package manager
 * installs peer dependencies by default.
 *
 * @param workspace The path to the workspace where the package manager will operate.
 * @param packageManager The package manager to use.
 * @param version The version of the package manager to use. This parameter is used only for testing.
 * @param config The configuration of the package manager to use. This parameter is used only for testing.
 * @returns True if the package manager installs peer dependencies by default, false otherwise.
 */
export async function installsPeerDependenciesByDefault(
  workspace: string,
  packageManager: PackageManager,
  version?: string,
  config?: Record<string, string>,
): Promise<boolean> {
  switch (packageManager) {
    case "npm":
      const npmVersion = await getVersion(workspace, "npm", version);
      const legacyPeerDeps = await getFromConfig(
        workspace,
        "npm",
        "legacy-peer-deps",
        config,
      );
      // If we couldn't retrieve the npm version, we assume it is higher than 7
      if (npmVersion === undefined || npmVersion.major >= 7) {
        // If legacy-peer-deps hasn't been explicitly set to true,
        // peer dependencies are installed by default
        if (legacyPeerDeps !== "true") {
          return true;
        }
      }
      return false;
    case "yarn":
      // https://github.com/yarnpkg/yarn/issues/1503
      return false;
    case "pnpm":
      // https://github.com/pnpm/pnpm/releases/tag/v8.0.0
      const pnpmVersion = await getVersion(workspace, "pnpm", version);
      const autoInstallPeers = await getFromConfig(
        workspace,
        "pnpm",
        "auto-install-peers",
        config,
      );
      // If we couldn't retrieve the pnpm version, we assume it is higher than 8
      if (pnpmVersion === undefined || pnpmVersion.major >= 8) {
        // If auto-install-peers hasn't been explicitly set to false,
        // peer dependencies are installed by default
        if (autoInstallPeers !== "false") {
          return true;
        }
      } else {
        // If auto-install-peers has been explicitly set to true,
        // peer dependencies are installed
        if (autoInstallPeers === "true") {
          return true;
        }
      }
      return false;
  }
}

async function getVersion(
  workspace: string,
  packageManager: PackageManager,
  version?: string,
): Promise<semver.SemVer | undefined> {
  if (version !== undefined) {
    return semver.parse(version) ?? undefined;
  }
  try {
    const versionString = execSync(`${packageManager} --version`, {
      cwd: workspace,
      encoding: "utf8",
    });
    return semver.parse(versionString) ?? undefined;
  } catch (_error) {
    return undefined;
  }
}

async function getFromConfig(
  workspace: string,
  packageManager: PackageManager,
  key: string,
  config?: Record<string, string>,
): Promise<string | undefined> {
  if (config !== undefined) {
    return config[key];
  }
  try {
    return execSync(`${packageManager} config get ${key}`, {
      cwd: workspace,
      encoding: "utf8",
    });
  } catch (_error) {
    return undefined;
  }
}
