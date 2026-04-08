import envPaths from "env-paths";

export const HARDHAT_PACKAGE_NAME = "hardhat";

export async function generatePaths(
  packageName: string,
): Promise<envPaths.Paths> {
  return envPaths(packageName);
}
