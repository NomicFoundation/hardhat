import type { PackageJson } from "@nomicfoundation/hardhat-utils/package";

import { readClosestPackageJson } from "@nomicfoundation/hardhat-utils/package";

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
  const { getRequest } = await import("@nomicfoundation/hardhat-utils/request");

  if (cachedLatestHardhatVersion !== undefined) {
    return cachedLatestHardhatVersion;
  }

  const packageJson: PackageJson = await readClosestPackageJson(
    import.meta.url,
  );

  const packageName = packageJson.name;

  const latestHardhat = await getRequest(
    `https://registry.npmjs.org/${packageName}/latest`,
  ).then(({ body }) => {
    /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    -- Cast to PackageJson because that's what we expect from the registry */
    return body.json() as Promise<PackageJson>;
  });

  cachedLatestHardhatVersion = latestHardhat.version;

  return cachedLatestHardhatVersion;
}
