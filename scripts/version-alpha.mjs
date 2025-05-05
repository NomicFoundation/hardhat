// @ts-check

import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { exec } from "node:child_process";
import { promisify } from "node:util";
import { randomUUID } from "node:crypto";

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
 * The next step is to create a changeset for hardhat-ethers if it does not
 * already exists. This is necessary because the hardhat-ethers package
 * is one major version ahead of the rest of the packages so we cannot include
 * it in the fixed packages set.
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

  if (shouldCreateHardhatEthersPackageChangeset(changesets)) {
    await createHardhatEthersPackageChangeset();
  }

  await executeChangesetVersion();

  const hardhatVersion = await readHardhatVersion();

  await updateHardhatChangelog(hardhatVersion, changesets);

  printFollowupInstructions(hardhatVersion, changesets);
}

/**
 * Read all the changesets that have not yet been applied
 * based on the pre.json file.
 */
async function readAllNewChangsets() {
  const allChangesetNames = (await readdir(changesetDir))
    .filter((file) => file.endsWith(".md"))
    .map((file) => file.slice(0, -3));

  const alreadyAppliedChangesetNames = JSON.parse(
    await readFile(path.join(changesetDir, "pre.json"))
  );

  const newChangesetNames = allChangesetNames.filter(
    (name) => !alreadyAppliedChangesetNames.changesets.includes(name)
  );

  const changesets = [];

  for (const newChangeSetName of newChangesetNames) {
    const changesetFilePath = path.join(changesetDir, `${newChangeSetName}.md`);

    const changesetContent = await readFile(changesetFilePath, "utf-8");

    const { content, frontMatter } = parseFrontMatter(changesetContent);
    const commitHash = await getAddingCommit(changesetFilePath);

    changesets.push({
      frontMatter,
      content,
      path: changesetFilePath,
      commitHash,
    });
  }

  return changesets;
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
    await readFile(path.join("v-next", "hardhat", "package.json"))
  );

  return hardhatPackageJson.version;
}

/**
 * Checks whether the hardhat-ethers package changeset should be created.
 */
function shouldCreateHardhatEthersPackageChangeset(changesets) {
  if (changesets.length === 0) {
    return false;
  }

  for (const { frontMatter } of changesets) {
    if (/"@nomicfoundation\/hardhat-ethers": patch$/.test(frontMatter)) {
      return false;
    }
  }

  return true;
}

/**
 * Write a hardhat-ethers changeset file that has a patch entry for the package.
 */
async function createHardhatEthersPackageChangeset() {
  const changesetPath = path.join(
    changesetDir,
    `${randomUUID()}.md`
  );

  const packageName = '@nomicfoundation/hardhat-ethers';

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

function printFollowupInstructions(hardhatVersion, changesets) {
  console.log(`

# ${hardhatVersion}

${generateReleaseMessage(changesets)}
`);
}

function generateChangelogFrom(hardhatVersion, changesets) {
  return `# hardhat

## ${hardhatVersion}

### Patch Changes

${generateChangesTextFrom(changesets)}
`;
}

function generateReleaseMessage(changesets) {
  return `This Hardhat 3 Alpha release [short summary of the changes].

### Changes

${generateChangesTextFrom(changesets)}

---
> 💡 **The Nomic Foundation is hiring! Check [our open positions](https://www.nomic.foundation/jobs).**
---
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

function parseFrontMatter(markdown) {
  const match = markdown.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) {
    return { frontMatter: null, content: markdown };
  }

  return {
    frontMatter: match[1],
    content: match[2],
  };
}

async function getAddingCommit(filePath) {
  try {
    const { stdout } = await execAsync(
      `git log --diff-filter=A --follow --format=%h -- "${filePath}"`
    );
    return stdout.trim() || null;
  } catch {
    return null;
  }
}

await versionAlpha();
