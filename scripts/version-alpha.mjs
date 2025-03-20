import { readdir, readFile, writeFile, stat } from "node:fs/promises";
import path from "node:path";
import { exec } from "node:child_process";
import { promisify } from "node:util";

const execAsync = promisify(exec);

const changesetDir = ".changeset";
const packagesDir = "v-next";

/**
 * This script applies changesets and creates a new Alpha version,
 * based on changesets pre-release versioning.
 *
 * It reads all the new changesets and validates that:
 *  - they patch the main Hardhat package
 *  - there are no major or minor changesets
 *
 * It then combines the new changesets to create a new changelog
 * section for the new version.
 *
 * The next step is to create a release changeset that patches all of the
 * packages (except Hardhat, which by definition is already covered).
 * By applying a changeset to all packages we eliminate issues
 * with peer depenendencies not being updated.
 *
 * The release changeset is then applied, bumping versions across
 * the packages (including the template packages).
 *
 * Finally the Hardhat packages changelog is updated with the
 * prepared changelog section.
 *
 * It is up to the user to commit and push the changes as a release
 * branch.
 */
async function versionAlpha() {
  const changesets = await readAllNewChangsets();

  validateChangesets(changesets);

  const currentHardhatAlphaVersion = await readCurrentHardhatAlphaVersion();
  const nextHardhatAlphaVersion = incrementHardhatAlphaVersion(
    currentHardhatAlphaVersion
  );

  await createAllPackageChangesetFor(nextHardhatAlphaVersion);

  await executeChangesetVersion();

  await updateHardhatChangelog(nextHardhatAlphaVersion, changesets);

  printFollowupInstructions(nextHardhatAlphaVersion, changesets);
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
 * - every changeset must include a `"hardhat": patch` entry
 * - no major or minor changesets are allowed
 */
function validateChangesets(changesets) {
  if (changesets.length === 0) {
    console.log("Error: No new changesets found.");
    process.exit(1);
  }

  let validationFailed = false;

  for (const { frontMatter, path: changesetPath } of changesets) {
    if (!/^\s*"hardhat": patch$/m.test(frontMatter)) {
      validationFailed = true;
      console.log(
        `Error: ${changesetPath}: No "hardhat: patch", every Alpha changeset must include hardhat`
      );
    }

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
async function readCurrentHardhatAlphaVersion() {
  const hardhatPackageJson = JSON.parse(
    await readFile(path.join("v-next", "hardhat", "package.json"))
  );

  return hardhatPackageJson.version;
}

/**
 * Increment the Alpha version by 1. We assume that the `next`
 * tag is always used.
 */
function incrementHardhatAlphaVersion(version) {
  const match = version.match(/(\d+\.\d+\.\d+)-next\.(\d+)/);

  if (!match) {
    console.log(`Unsupported version format: ${version}`);
    process.exit(1);
  }

  const [, base, num] = match;
  const nextNum = Number(num) + 1;

  return `${base}-next.${nextNum}`;
}

/**
 * Write a changeset file that has one entry for every package
 * under `./v-next` excluding the hardhat package (this is
 * covered definitionally because of the validation rules).
 */
async function createAllPackageChangesetFor(nextHardhatAlphaVersion) {
  const releaseChangesetPath = path.join(
    changesetDir,
    `release-${nextHardhatAlphaVersion}.md`
  );

  const packageNames = await readAllPackageNames();

  const releaseChangesetContent = `---
${packageNames
  .filter((name) => name !== "hardhat")
  .map((name) => `"${name}": patch`)
  .join("\n")}
---

Hardhat 3 Alpha release (${new Date().toISOString()})
`;

  await writeFile(releaseChangesetPath, releaseChangesetContent);
}

/**
 * Use changeset via pnpm to bump versions across packages
 * then update the pnpm lock file based on those changes.
 */
async function executeChangesetVersion() {
  await execAsync("pnpm changeset version");
  await execAsync("pnpm install");
}

/**
 * Prepend a new changelog section to the Hardhat package's
 * changelog based on the new changesets.
 */
async function updateHardhatChangelog(nextHardhatAlphaVersion, changesets) {
  const newChangelogSection = generateChangelogFrom(
    nextHardhatAlphaVersion,
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

function printFollowupInstructions(nextHardhatAlphaVersion, changesets) {
  console.log(`

# ${nextHardhatAlphaVersion}

${generateReleaseMessage(changesets)}
`);
}

async function readAllPackageNames() {
  const ignoredChangesetPackages = JSON.parse(
    await readFile(path.join(changesetDir, "config.json"))
  ).ignore;

  const subdirs = await readdir(packagesDir);

  const packageNames = [];

  for (const dir of subdirs) {
    const packageJsonPath = path.join(packagesDir, dir, "package.json");

    try {
      const stats = await stat(packageJsonPath);

      if (!stats.isFile()) {
        continue;
      }

      const pkgJson = JSON.parse(await readFile(packageJsonPath, "utf8"));

      if (ignoredChangesetPackages.includes(pkgJson.name)) {
        continue;
      }

      packageNames.push(pkgJson.name);
    } catch (error) {
      console.log(error);
      process.exit(1);
    }
  }

  return packageNames.sort();
}

function generateChangelogFrom(nextHardhatAlphaVersion, changesets) {
  return `# hardhat

## ${nextHardhatAlphaVersion}

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
