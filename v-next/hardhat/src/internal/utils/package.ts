import type { PackageJson } from "@nomicfoundation/hardhat-utils/package";

import { readFile } from "node:fs/promises";

import {
  findClosestPackageRoot,
  findDependencyPackageJson,
  readClosestPackageJson,
} from "@nomicfoundation/hardhat-utils/package";

let cachedHardhatVersion: string | undefined;
let cachedLatestHardhatVersion: string | undefined;
let cachedEdrVersion: string | undefined;

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

export async function getEdrVersion(): Promise<string> {
  if (cachedEdrVersion !== undefined) {
    return cachedEdrVersion;
  }

  const hardhatRoot = await findClosestPackageRoot(import.meta.url);

  const edrPackageJsonPath = await findDependencyPackageJson(
    hardhatRoot,
    "@nomicfoundation/edr",
  );

  if (edrPackageJsonPath === undefined) {
    return "";
  }

  const rawPackageJson = await readFile(edrPackageJsonPath, "utf-8");
  const edrPackageJson: PackageJson = JSON.parse(rawPackageJson);
  cachedEdrVersion = edrPackageJson.version;

  return cachedEdrVersion;
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
