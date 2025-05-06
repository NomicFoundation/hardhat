import { appendFile } from "node:fs/promises";

// The regex was taken from https://semver.org/#is-there-a-suggested-regular-expression-regex-to-check-a-semver-string
const semverRegex = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/;

function wasHardhatPublished() {
  if (process.env.STEPS_PUBLISH_OUTPUTS_STDOUT === undefined) {
    throw new Error("STEPS_PUBLISH_OUTPUTS_STDOUT is not defined");
  }

  const lines = process.env.STEPS_PUBLISH_OUTPUTS_STDOUT.split("\n");

  return lines.some((line) => line.startsWith("+ hardhat@"));
}

async function getHardhatPackageVersion() {
  const pkg = await readFile("v-next/hardhat/package.json", "utf-8");
  const { version } = JSON.parse(pkg);
  return version;
}

async function getHardhatNpmVersion() {
  const url = `https://registry.npmjs.org/hardhat/latest`;
  const response = await fetch(url);
  if (response.status !== 200) {
    throw new Error(`Failed to fetch ${url}: ${response.statusText}`);
  }
  const json = await response.json();
  return json.version;
}

function isPrerelease(version) {
  const [, , , , prerelease] = version.match(semverRegex);
  return prerelease !== undefined;
}

async function isLatest(version) {
  const npm = await getHardhatNpmVersion();
  return version === npm;
}

async function getHardhatChangelogEntry(version) {
  const changelog = await readFile("v-next/hardhat/CHANGELOG.md", "utf-8");

  const lines = changelog.split('\n')
  const headerIndex = lines.findIndex((line) => line == `## ${version}`)

  if (headerIndex == -1) {
    throw new Error(`Changelog entry for version ${version} not found in ./v-next/hardhat/CHANGELOG.md`)
  }

  const entryLines = [];

  for (const line of lines.slice(headerIndex + 1)) {
    if (line.startsWith('## ')) {
      break
    }
    if (line === '### Patch Changes') {
      entryLines.push('### Changes');
    } else {
      entryLines.push(line)
    }
  }

  return entryLines.join('\n').trim()
}

async function getReleaseBody(version) {
  const lines = [
    "This Hardhat 3 Alpha release [short summary of the changes].",
    "",
    await getHardhatChangelogEntry(version),
    "",
    "---",
    "> 💡 **The Nomic Foundation is hiring! Check [our open positions](https://www.nomic.foundation/jobs).**",
    "---",
  ];
  return lines.join("\n");
}

async function prepareGitHubRelease() {
  if (process.env.GITHUB_OUTPUT === undefined) {
    throw new Error("GITHUB_OUTPUT is not defined");
  }

  const published = wasHardhatPublished();
  console.log(`published: ${published}`);

  await appendFile(process.env.GITHUB_OUTPUT, `published=${published}\n`);

  if (!published) {
    return;
  }

  const version = await getHardhatPackageVersion();
  console.log(`version: ${version}`);

  const prerelease = isPrerelease(version);
  console.log(`prerelease: ${prerelease}`);

  const latest = await isLatest(version);
  console.log(`latest: ${latest}`);

  const releaseBody = await getReleaseBody(version);
  console.log(`releaseBody: ${releaseBody}`);

  await appendFile(process.env.GITHUB_OUTPUT, `version=${version}\n`)
  await appendFile(process.env.GITHUB_OUTPUT, `prerelease=${prerelease}\n`);
  await appendFile(process.env.GITHUB_OUTPUT, `latest=${latest}\n`);
  await appendFile(process.env.GITHUB_OUTPUT, [
    "body<<EOF",
    releaseBody,
    "EOF",
  ]);
}

await prepareGitHubRelease();
