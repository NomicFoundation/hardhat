import type { PackageJson } from "@ignored/hardhat-vnext-utils/package";

import { readClosestPackageJson } from "@ignored/hardhat-vnext-utils/package";

let cachedHardhatVersion: string | undefined;
let cachedLatestHardhatVersion: string | undefined;

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

export async function getLatestHardhatVersion(): Promise<string> {
  if (cachedLatestHardhatVersion !== undefined) {
    return cachedLatestHardhatVersion;
  }

  const packageJson: PackageJson = await readClosestPackageJson(
    import.meta.url,
  );

  const packageName = packageJson.name;

  const latestHardhat = (await fetch(
    `https://registry.npmjs.org/${packageName}/latest`,
  ).then((res) => res.json())) as { version: string };

  cachedLatestHardhatVersion = latestHardhat.version;

  return cachedLatestHardhatVersion;
}
