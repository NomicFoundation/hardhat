// @ts-check

import { appendFile } from "node:fs/promises";
import { readFile } from "node:fs/promises";

import { getLatestPackageVersionFromNpm, readPackage } from "./lib/packages.mjs";

// The regex was taken from https://semver.org/#is-there-a-suggested-regular-expression-regex-to-check-a-semver-string
const semverRegex = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/;

function isPrerelease(version) {
  const [, , , , prerelease] = version.match(semverRegex);
  return prerelease !== undefined;
}

async function isLatest(version) {
  const latestVersion = await getLatestPackageVersionFromNpm("hardhat");
  return version === latestVersion;
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

  const hardhat = await readPackage("hardhat");

  const prerelease = isPrerelease(hardhat.version);
  console.log(`prerelease: ${prerelease}`);
  await appendFile(process.env.GITHUB_OUTPUT, `prerelease=${prerelease}\n`);

  const latest = await isLatest(hardhat.version);
  console.log(`latest: ${latest}`);
  await appendFile(process.env.GITHUB_OUTPUT, `latest=${latest}\n`);

  const body = await getReleaseBody(hardhat.version);
  console.log(`body: ${body}`);
  await appendFile(process.env.GITHUB_OUTPUT, `body<<EOF\n${body}\nEOF\n`);
}

await prepareGitHubRelease();
