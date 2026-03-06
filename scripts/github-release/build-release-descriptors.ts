export interface ReleaseDescriptor {
  tagName: string;
  title: string;
  body: string;
  draft: boolean;
  latest: boolean;
}

/**
 * Transforms a publish summary and changelogs into an array of release
 * descriptors.
 */
export function buildReleaseDescriptors(
  publishSummary: {
    publishedPackages: Array<{ name: string; version: string }>;
  },
  changelogs: Map<string, string>,
): ReleaseDescriptor[] {
  const descriptors = [];

  for (const { name, version } of publishSummary.publishedPackages) {
    const isHardhat = name === "hardhat";
    const changelog = changelogs.get(name);

    if (changelog === undefined) {
      throw new Error(`No changelog content found for package ${name}`);
    }

    const changelogEntry = _getChangelogEntry(changelog, version);

    descriptors.push({
      tagName: `${name}@${version}`,
      draft: isHardhat,
      latest: isHardhat,
      title: isHardhat ? `Hardhat v${version}` : "",
      body: _buildReleaseBody(changelogEntry, isHardhat),
    });
  }

  return descriptors;
}

/**
 * Extracts the changelog entry for a specific version from raw changelog content.
 * Normalizes major/minor/patch changes to "### Changes".
 * Throws if the version header is not found.
 */
function _getChangelogEntry(changelog: string, version: string): string {
  const lines = changelog.split("\n");
  const headerIndex = lines.findIndex((line) => line === `## ${version}`);

  if (headerIndex === -1) {
    throw new Error(`Changelog entry for version ${version} not found`);
  }

  const entryLines: string[] = [];
  let pushedChangesLine = false;

  for (let index = headerIndex + 1; index < lines.length; index++) {
    const line = lines[index];
    if (line.startsWith("## ")) {
      break;
    }

    if (
      line === "### Major Changes" ||
      line === "### Minor Changes" ||
      line === "### Patch Changes"
    ) {
      if (!pushedChangesLine) {
        entryLines.push("### Changes");
        pushedChangesLine = true;
        continue;
      }

      // If we are on subsequent changes subtitle, we probably pushed a blank
      // line that was separating the subtitle, so we remove it.
      if (entryLines[entryLines.length - 1] === "") {
        entryLines.pop();
      }

      // Also, there's probably a blank line after the subtitle, so we skip it.
      if (index + 1 < lines.length && lines[index + 1].trim() === "") {
        index++;
      }
    } else {
      entryLines.push(line);
    }
  }

  return entryLines.join("\n").trim();
}

/**
 * Builds the full release body from a changelog entry. The Hardhat package
 * has a placeholder summary line prefixed.
 */
function _buildReleaseBody(changelogEntry: string, isHardhat: boolean): string {
  return [
    "This release [short summary of the changes].",
    "",
    changelogEntry,
    "",
    "---",
    "> 💡 **The Nomic Foundation is hiring! Check [our open positions](https://www.nomic.foundation/jobs).**",
    "---",
  ]
    .slice(isHardhat ? 0 : 2)
    .join("\n");
}
