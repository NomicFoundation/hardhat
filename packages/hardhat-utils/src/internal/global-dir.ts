import type { Paths } from "env-paths";

export const HARDHAT_PACKAGE_NAME = "hardhat";

// We don't load env-paths on startup because this module is transitively
// imported from many places but generatePaths is rarely called during
// bootstrap.
let envPaths: ((name: string) => Paths) | undefined;

export async function generatePaths(packageName: string): Promise<Paths> {
  if (envPaths === undefined) {
    ({ default: envPaths } = await import("env-paths"));
  }
  return envPaths(packageName);
}
