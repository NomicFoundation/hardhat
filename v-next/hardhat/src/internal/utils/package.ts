import type { PackageJson } from "@ignored/hardhat-vnext-utils/package";

import { readClosestPackageJson } from "@ignored/hardhat-vnext-utils/package";

export async function getHardhatVersion(): Promise<string> {
  const packageJson: PackageJson = await readClosestPackageJson(
    import.meta.url,
  );

  return packageJson.version;
}
