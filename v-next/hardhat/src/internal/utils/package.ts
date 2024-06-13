import type { PackageJson } from "@nomicfoundation/hardhat-utils/package";

import { fileURLToPath } from "node:url";

import { assertHardhatInvariant } from "@nomicfoundation/hardhat-errors";
import { readJsonFile } from "@nomicfoundation/hardhat-utils/fs";
import { findClosestPackageJson } from "@nomicfoundation/hardhat-utils/package";

export async function getHardhatVersion(): Promise<string> {
  const packageJsonPath = await findClosestPackageJson(
    fileURLToPath(import.meta.url),
  );

  assertHardhatInvariant(
    packageJsonPath !== null,
    "There should be a package.json in hardhat's root directory",
  );

  const packageJson: PackageJson = await readJsonFile(packageJsonPath);

  return packageJson.version;
}
