import type { PackageJson } from "@ignored/hardhat-vnext-utils/package";

import { readClosestPackageJson } from "@ignored/hardhat-vnext-utils/package";

let cachedHardhatVersion: string | undefined;

export async function getHardhatVersion(): Promise<string> {
  if (cachedHardhatVersion !== undefined) {
    return cachedHardhatVersion;
  }

  const packageJson: PackageJson = await readClosestPackageJson(
    import.meta.url,
  );

  cachedHardhatVersion = packageJson.version;

  return packageJson.version;
}
