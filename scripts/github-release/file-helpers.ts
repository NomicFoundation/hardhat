import type { ReleaseDescriptor } from "./build-release-descriptors.ts";

import { readFile } from "node:fs/promises";
import path from "node:path";

const PACKAGES_DIR = "v-next";

/**
 * Reads and parses pnpm-publish-summary.json from the current directory.
 * Exits with a helpful error message if the file is not found.
 */
export async function readPublishSummary(): Promise<{
  publishedPackages: Array<{ name: string; version: string }>;
}> {
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
 */
export async function readChangelogsForPublishedPackages(publishSummary: {
  publishedPackages: Array<{ name: string; version: string }>;
}): Promise<Map<string, string>> {
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
 */
export function buildGitHubCliReleaseArgs(
  release: ReleaseDescriptor,
): string[] {
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
 */
function _getChangelogPath(packageName: string): string {
  const unscopedName = packageName.replace(/^@[^/]+\//, "");

  return path.join(PACKAGES_DIR, unscopedName, "CHANGELOG.md");
}
