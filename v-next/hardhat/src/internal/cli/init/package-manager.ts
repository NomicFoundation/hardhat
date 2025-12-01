import { execSync } from "node:child_process";

import semver from "semver";

type PackageManager = "npm" | "yarn" | "pnpm" | "bun" | "deno";

/**
 * getPackageManager returns the name of the package manager used to run Hardhat
 *
 * This logic is based on the env variable `npm_config_user_agent`, which is set
 * by all major package manager, both when running a package that has been
 * installed, and when it hasn't.
 *
 * Here's how to reproduce it, with the value of the env var:
 *
 * npm:
 *
 *   uninstalled: npx -y print-environment
 *     "npm/11.6.1 node/v24.10.0 linux arm64 workspaces/false"
 *
 *   installed: npm init -y && npm i print-environment && npx print-environment
 *     "npm/11.6.1 node/v24.10.0 linux arm64 workspaces/false"
 *
 *
 * pnpm:
 *
 *   uninstalled: pnpm dlx print-environment
 *     "pnpm/10.18.3 npm/? node/v24.10.0 linux arm64"
 *
 *   installed: pnpm init && pnpm add print-environment && pnpm print-environment
 *     "pnpm/10.18.3 npm/? node/v24.10.0 linux arm64"
 *
 *
 * yarn classic:
 *   uninstalled: unsupported
 *
 *   installed: yarn init -y && yarn add print-environment && yarn print-environment
 *     "yarn/1.22.22 npm/? node/v24.10.0 linux arm64"
 *
 * yarn berry:
 *
 *   uninstalled: yarn set version berry && yarn dlx print-environment
 *     "yarn/4.10.3 npm/? node/v24.10.0 linux arm64"
 *
 *   installed: yarn set version berry && yarn add print-environment && yarn print-environment
 *     "yarn/4.10.3 npm/? node/v24.10.0 linux arm64"
 *
 * bun:
 *
 *   uninstalled: bunx print-environment
 *     "bun/1.3.1 npm/? node/v24.3.0 linux arm64"
 *
 *   installed: bun init -y && bun add print-environment && bun print-environment
 *     "bun/1.3.1 npm/? node/v24.3.0 linux arm64"
 *
 * deno:
 *
 *   uninstalled: deno run -A npm:print-environment
 *     "deno/2.5.6 npm/? deno/2.5.6 linux aarch64"
 *
 *   installed: deno init && deno add npm:print-environment && deno --allow-env print-environment
 *     "deno/2.5.6 npm/? deno/2.5.6 linux aarch64"
 *
 * @returns The name of the package manager used to run hardhat.
 */
export function getPackageManager(): PackageManager {
  const DEFAULT = "npm";

  const userAgent = process.env.npm_config_user_agent;

  if (userAgent === undefined) {
    return DEFAULT;
  }

  const firstSlashIndex = userAgent.indexOf("/");
  if (firstSlashIndex === -1) {
    return DEFAULT;
  }

  const packageManager = userAgent.substring(0, firstSlashIndex);

  switch (packageManager) {
    case "npm":
      return "npm";
    case "yarn":
      return "yarn";
    case "pnpm":
      return "pnpm";
    case "bun":
      return "bun";
    case "deno":
      return "deno";
    default:
      return DEFAULT;
  }
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
    deno: ["deno", "add"],
    bun: ["bun", "add", "--dev"],
  };
  const command = packageManagerToCommand[packageManager];
  // We quote all the dependency identifiers so that they can be run on a shell
  // without semver symbols interfering with the command
  command.push(
    ...dependencies.map((d) => {
      if (packageManager === "deno") {
        return `"npm:${d}"`;
      }

      return `"${d}"`;
    }),
  );
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
    case "bun":
      // Bun has installed peer dependencies for over 2 years, so that's fine
      // https://github.com/oven-sh/bun/releases/tag/bun-v1.0.5
      // This can be disabled, and there's no easy way to check that, so we
      // assume true for now
      return true;
    case "deno":
      // Deno doesn't autoinstall peers
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
