/**
 * The package managers a scenario can run under, and how a user invokes
 * Hardhat with each.
 *
 * `runRemote` is the command a user types before a project exists, and `run`
 * the one inside a project. They follow the `RunRemote` and `Run` components
 * the documentation site uses for its per-package-manager tabs, so a scenario
 * says what the docs say. Bun has no tab there; `bunx` works for both.
 *
 * Yarn is left out for now: `yarn dlx hardhat --init` does not work in an
 * empty directory, and Hardhat does not run under Yarn Plug'n'Play.
 */
export const PACKAGE_MANAGERS = {
  npm: { runRemote: "npx", run: "npx" },
  pnpm: { runRemote: "pnpm dlx", run: "pnpm" },
  bun: { runRemote: "bunx", run: "bunx" },
} as const;

export type PackageManager = keyof typeof PACKAGE_MANAGERS;

export function isPackageManager(name: string): name is PackageManager {
  return Object.hasOwn(PACKAGE_MANAGERS, name);
}

/**
 * The values a templated scenario's `{{name}}` placeholders take under one
 * package manager.
 */
export function templateValues(
  packageManager: PackageManager,
): Record<string, string> {
  return {
    ...PACKAGE_MANAGERS[packageManager],
    packageManager,
  };
}

/** Every name a scenario can use in a placeholder. */
export const TEMPLATE_NAMES: readonly string[] = Object.keys(
  templateValues("npm"),
);
