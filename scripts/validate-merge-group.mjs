// @ts-check

/**
 * A merge group is valid if it contains no new changesets or all the
 * currently checked-in versions of the packages are released to npm.
 * The former is an indicationthat the merge group consists of a release PR
 * and/or PRs that don't needa changeset. The latter is an indication that the
 * merge group does notcontain a release PR.
 */

import { readdir, readFile } from "node:fs/promises";

import { readAllNewChangsets } from './lib/changesets.mjs';

const packagesDir = "v-next";

// NOTE: This function is currently unused but it could be useful to preserve
// the information about how to do it.
function getPullNumber(headRef) {
  // The head ref (github.event.merge_group.head_ref) is of the form:
  // refs/heads/gh-readonly-queue/master/pr-6-90b00e094e6de7fc4f3fac9a0087c01cf48acad8
  const [, _baseRefName, pullNumber, _headSha] = headRef.match(
    /^refs\/heads\/gh-readonly-queue\/([^\/]+)\/pr-(\d+)-([a-z0-9]+)$/,
  );
  return parseInt(pullNumber, 10);
}

/**
 * Read all the package.json files of the packages that we release to npm.
 */
async function readAllReleasedPackages() {
  const allPackageNames = (await readdir(packagesDir))
    .filter(file => ['config', 'example-project', 'template-package'].includes(file));

  const allPackages = allPackageNames
    .map(file => `./v-next/${file}/package.json`)
    .map(async (path) => JSON.parse(await readFile(path, 'utf-8')));

  return Promise.all(allPackages);
}

async function isPackageReleasedToNpm(pkg) {
  const url = `https://registry.npmjs.org/${pkg.name}/${pkg.version}`;
  const response = await fetch(url);
  return response.status === 200;
}

async function validateMergeGroup() {
  const changesets = await readAllNewChangsets();

  if (changesets.length === 0) {
    console.log('No new changesets found');
    return;
  }

  const packages = await readAllReleasedPackages();

  for (const pkg of packages) {
    if (!(await isPackageReleasedToNpm(pkg))) {
      throw new Error(`Package ${pkg.name} is not released to npm`);
    }
  }

  console.log('All packages are released to npm');
  return;
}

await validateMergeGroup();
