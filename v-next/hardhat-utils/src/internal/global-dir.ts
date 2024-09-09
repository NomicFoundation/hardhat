import type envPaths from "env-paths";

export const HARDHAT_PACKAGE_NAME = "hardhat";

export async function generatePaths(
  packageName: string,
): Promise<envPaths.Paths> {
  const { default: envPaths } = await import("env-paths");
  return envPaths(packageName);
}
