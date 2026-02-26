// @ts-check

/** @import { ReleaseDescriptor } from "./build-release-descriptors.mjs" */

import { readFile } from "node:fs/promises";
import path from "node:path";

const PACKAGES_DIR = "v-next";

/**
 * Reads and parses pnpm-publish-summary.json from the current directory.
 * Exits with a helpful error message if the file is not found.
 *
 * @returns {Promise<{ publishedPackages: Array<{ name: string, version: string }> }>}
 */
export async function readPublishSummary() {
  try {
    return JSON.parse(await readFile("pnpm-publish-summary.json", "utf8"));
  } catch {
    console.error(
      "Could not read pnpm-publish-summary.json.\n\n" +
        "It should be generated in the CI, to generate it locally run:\n" +
        '  pnpm publish --filter "./v-next/**" -r --no-git-checks --access public --report-summary --dry-run',
    );

    process.exit(1);
  }
}

/**
 * Reads the raw changelog contents for each published package.
 *
 * @param {{ publishedPackages: Array<{ name: string, version: string }>}} publishSummary
 * @returns {Promise<Map<string, string>>} Map of package name → raw changelog content
 */
export async function readChangelogsForPublishedPackages(publishSummary) {
  const changelogs = new Map();

  for (const { name } of publishSummary.publishedPackages) {
    const changelogPath = _getChangelogPath(name);

    const content = await readFile(changelogPath, "utf-8");

    changelogs.set(name, content);
  }

  return changelogs;
}

/**
 * Builds the argument list for `gh release create` from a release descriptor.
 *
 * @param {ReleaseDescriptor} release
 * @returns {string[]}
 */
export function buildGitHubCliReleaseArgs(release) {
  const args = ["release", "create", release.tagName, "--notes", release.body];

  if (release.title) {
    args.push("--title", release.title);
  }

  if (release.draft) {
    args.push("--draft");
  }

  if (!release.latest) {
    args.push("--latest=false");
  }

  return args;
}

/**
 * Returns the path to the CHANGELOG.md for a given package name.
 * Strips the npm scope (e.g. `@nomicfoundation/`) to get the directory name.
 *
 * @param {string} packageName - The npm package name (possibly scoped)
 * @returns {string}
 */
function _getChangelogPath(packageName) {
  const unscopedName = packageName.replace(/^@[^/]+\//, "");

  // These packages have folder names that don't match the unscoped package name
  if (unscopedName === "ignition-core") {
    return path.join(PACKAGES_DIR, "hardhat-ignition-core", "CHANGELOG.md");
  }

  if (unscopedName === "ignition-ui") {
    return path.join(PACKAGES_DIR, "hardhat-ignition-ui", "CHANGELOG.md");
  }

  return path.join(PACKAGES_DIR, unscopedName, "CHANGELOG.md");
}
