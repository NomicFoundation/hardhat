import type { PackageJson } from "@nomicfoundation/hardhat-utils/package";

import { readClosestPackageJson } from "@nomicfoundation/hardhat-utils/package";

export async function getHardhatVersion(): Promise<string> {
  const packageJson: PackageJson = await readClosestPackageJson(
    import.meta.url,
  );

  return packageJson.version;
}
