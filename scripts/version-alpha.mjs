// @ts-check

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { exec } from "node:child_process";
import { promisify } from "node:util";
import { randomUUID } from "node:crypto";

import { readAllNewChangsets } from "./lib/changesets.mjs";

const execAsync = promisify(exec);

const changesetDir = ".changeset";
const packagesDir = "v-next";

/**
 * This script applies changesets based on changesets pre-release versioning.
 *
 * It reads all the new changesets and validates that:
 *  - there are no major or minor changesets
 *
 * It then combines the new changesets to create a new changelog
 * section for the new version.
 *
 * The next step is to create a changeset for packages which are one major
 * version ahead of all the others (v4 vs v3) if they don't exist yet. The major
 * version mismatch is the reason why we cannot include them in the fixed set.
 *
 * The release changeset is then applied, bumping versions across
 * the packages (including the template packages).
 *
 * Finally the Hardhat packages changelog is updated with the
 * prepared changelog section.
 */
async function versionAlpha() {
  const changesets = await readAllNewChangsets();

  validateChangesets(changesets);

  for (const packageName of ["@nomicfoundation/hardhat-ethers", "@nomicfoundation/hardhat-toolbox-viem"]) {
    if (shouldCreateChangeset(changesets, packageName)) {
      await createChangeset(packageName);
    }
  }

  await executeChangesetVersion();

  const hardhatVersion = await readHardhatVersion();

  await updateHardhatChangelog(hardhatVersion, changesets);
}

/**
 * Validate that the changesets meet our rules for an Alpha release
 * changeset, logging and killing the script otherwise.
 *
 * The validations are:
 * - no major or minor changesets are allowed
 */
function validateChangesets(changesets) {
  if (changesets.length === 0) {
    console.log("No new changesets found.");
    process.exit(0);
  }

  let validationFailed = false;

  for (const { frontMatter, path: changesetPath } of changesets) {
    if (/: (major|minor)\s*$/m.test(frontMatter)) {
      validationFailed = true;
      console.log(
        `Error: ${changesetPath}: No "major" or "minor" changesets are allowed in Alpha`
      );
    }
  }

  if (validationFailed) {
    process.exit(1);
  }
}

/**
 * Read the current Alpha version based on the hardhat package.json
 */
async function readHardhatVersion() {
  const hardhatPackageJson = JSON.parse(
    (await readFile(path.join("v-next", "hardhat", "package.json"))).toString()
  );

  return hardhatPackageJson.version;
}

/**
 * Checks whether a new changeset should be created for the package.
 */
function shouldCreateChangeset(changesets, packageName) {
  if (changesets.length === 0) {
    return false;
  }

  for (const { frontMatter } of changesets) {
    if (frontMatter.split("\n").some((line) => line.startsWith(`"${packageName}": patch`))) {
      return false;
    }
  }

  return true;
}

/**
 * Creates a new patch changeset file for the pacakge.
 */
async function createChangeset(packageName) {
  const changesetPath = path.join(
    changesetDir,
    `${randomUUID()}.md`
  );

  const releaseChangesetContent = [
    '---',
    `"${packageName}": patch`,
    '---',
    '',
  ].join('\n');

  await writeFile(changesetPath, releaseChangesetContent);
}

/**
 * Use changeset via pnpm to bump versions across packages
 * then update the pnpm lock file based on those changes.
 */
async function executeChangesetVersion() {
  await execAsync("pnpm changeset version");
  await execAsync("pnpm install --lockfile-only");
}

/**
 * Prepend a new changelog section to the Hardhat package's
 * changelog based on the new changesets.
 */
async function updateHardhatChangelog(hardhatVersion, changesets) {
  const newChangelogSection = generateChangelogFrom(
    hardhatVersion,
    changesets
  );

  const hardhatChangelogPath = path.join(
    packagesDir,
    "hardhat",
    "CHANGELOG.md"
  );

  const currentChangelog = await readFile(hardhatChangelogPath, "utf-8");

  const newChangelog = currentChangelog.replace(
    "# hardhat\n",
    newChangelogSection
  );

  await writeFile(hardhatChangelogPath, newChangelog);
}

function generateChangelogFrom(hardhatVersion, changesets) {
  return `# hardhat

## ${hardhatVersion}

### Patch Changes

${generateChangesTextFrom(changesets)}
`;
}

function generateChangesTextFrom(changesets) {
  return changesets
    .map(({ content, commitHash }) =>
      content
        .trim()
        .split("\n")
        .map(
          (entry) =>
            `- ${
              commitHash !== null ? `${commitHash.slice(0, 7)}: ` : ""
            }${entry}`
        )
        .join("\n")
    )
    .join("\n");
}

await versionAlpha();
