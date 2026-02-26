// @ts-check

/**
 * @typedef {{
 *   tagName: string,
 *   title: string,
 *   body: string,
 *   draft: boolean,
 *   latest: boolean,
 * }} ReleaseDescriptor
 */

/**
 * Transforms a publish summary and changelogs into an array of release
 * descriptors.
 *
 * @param {{ publishedPackages: Array<{ name: string, version: string }>}} publishSummary
 * @param {Map<string, string>} changelogs - Map of package name → raw changelog content
 * @returns {ReleaseDescriptor[]}
 */
export function buildReleaseDescriptors(publishSummary, changelogs) {
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
 * Normalises major/minor/patch changes to "### Changes".
 * Throws if the version header is not found.
 *
 * @param {string} changelog - Raw changelog file content
 * @param {string} version - The semver version string to look up
 * @returns {string} The trimmed changelog entry body
 */
function _getChangelogEntry(changelog, version) {
  const lines = changelog.split("\n");
  const headerIndex = lines.findIndex((line) => line === `## ${version}`);

  if (headerIndex === -1) {
    throw new Error(`Changelog entry for version ${version} not found`);
  }

  /**
   * @type {string[]}
   */
  const entryLines = [];
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
 *
 * @param {string} changelogEntry - The extracted changelog entry body
 * @param {boolean} isHardhat - Whether the package is the `hardhat` package
 * @returns {string}
 */
function _buildReleaseBody(changelogEntry, isHardhat) {
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
