export const HARDHAT_PACKAGE_NAME = "hardhat";

export interface Paths {
  data: string;
  config: string;
  cache: string;
  log: string;
  temp: string;
}

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
