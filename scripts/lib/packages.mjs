// @ts-check

import { readdir, readFile } from "node:fs/promises";

const packagesDir = "v-next";

/**
 * Read all the package.json files of the packages that we release to npm.
 */
export async function readAllReleasablePackages() {
  const allPackageNames = (await readdir(packagesDir))
    .filter(file => !['config', 'example-project', 'template-package', 'hardhat-test-utils'].includes(file));

  return Promise.all(allPackageNames.map(readPackage));
}

export async function readPackage(name) {
  return JSON.parse(await readFile(`./v-next/${name}/package.json`, 'utf-8'));
}

export async function getLatestPackageVersionFromNpm(name) {
  const url = `https://registry.npmjs.org/${name}/latest`;
  const response = await fetch(url);
  if (response.status !== 200) {
    throw new Error(`Failed to fetch ${url}: ${response.statusText}`);
  }
  const json = await response.json();
  return json.version;
}

export async function isPackageReleasedToNpm(name, version) {
  const url = `https://registry.npmjs.org/${name}/${version}`;
  const response = await fetch(url);
  return response.status === 200;
}
