// @ts-check

/**
 * A pull request is valid if:
 * - it is a release PR (i.e. its head ref starts with "changeset-release/")
 * - or it is labeled as "no docs needed"
 * - or it has a `# docs:` URL in a changeset frontmatter pointing to a hardhat-website PR
 * - or the PR body links to a hardhat-website issue
 *
 * A pull request FAILS if the PR body contains a hardhat-website /pull/ link
 * (those must go in changeset frontmatters instead).
 */

import { exec as execSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { promisify } from "node:util";

import {
  parseFrontMatter,
  extractDocsUrlsFromFrontMatter,
} from "./lib/changesets.mjs";

const exec = promisify(execSync);

const SKIP_LABEL = "no docs needed";
const changesetDir = ".changeset";

function isReleasePR() {
  if (process.env.GITHUB_HEAD_REF === undefined) {
    throw new Error("GITHUB_HEAD_REF is not defined");
  }

  return process.env.GITHUB_HEAD_REF.startsWith("changeset-release/");
}

function hasNoDocsNeededLabel() {
  if (process.env.GITHUB_EVENT_PULL_REQUEST_LABELS === undefined) {
    throw new Error("GITHUB_EVENT_PULL_REQUEST_LABELS is not defined");
  }

  const labels = JSON.parse(process.env.GITHUB_EVENT_PULL_REQUEST_LABELS);

  return labels.some((l) => l.name === SKIP_LABEL);
}

function hasDocsLinkInPRBody() {
  const prBody = process.env.GITHUB_EVENT_PULL_REQUEST_BODY;

  if (prBody === undefined) {
    throw new Error("GITHUB_EVENT_PULL_REQUEST_BODY is not defined");
  }

  return prBody
    .toLowerCase()
    .includes("github.com/nomicfoundation/hardhat-website/pull");
}

function hasIssueLinkInPRBody() {
  const prBody = process.env.GITHUB_EVENT_PULL_REQUEST_BODY;

  if (prBody === undefined) {
    throw new Error("GITHUB_EVENT_PULL_REQUEST_BODY is not defined");
  }

  return prBody
    .toLowerCase()
    .includes("github.com/nomicfoundation/hardhat-website/issues");
}

async function hasDocsLinkInChangesets() {
  if (process.env.GITHUB_BASE_REF === undefined) {
    throw new Error("GITHUB_BASE_REF is not defined");
  }

  const { stdout } = await exec(
    `git diff --name-only --diff-filter=A ${process.env.GITHUB_BASE_REF} -- ${changesetDir}`,
  );

  const changesetFiles = stdout
    .trim()
    .split("\n")
    .filter((file) => file.endsWith(".md"));

  for (const file of changesetFiles) {
    const content = await readFile(file, "utf-8");
    const { frontMatter } = parseFrontMatter(content);
    const urls = extractDocsUrlsFromFrontMatter(frontMatter);
    if (urls.length > 0) return true;
  }

  return false;
}

async function validatePullRequest() {
  if (isReleasePR()) {
    console.log("Ignore docs check for release PR.");
    return;
  }

  if (hasNoDocsNeededLabel()) {
    console.log(`The PR is labeled as '${SKIP_LABEL}'`);
    return;
  }

  if (hasDocsLinkInPRBody()) {
    throw new Error(
      "Found a hardhat-website PR link in the PR body. " +
        "Please move it to a changeset frontmatter as a YAML comment instead:\n\n" +
        "  ---\n" +
        "  # docs: https://github.com/NomicFoundation/hardhat-website/pull/<number>\n" +
        '  "package-name": patch\n' +
        "  ---",
    );
  }

  if (await hasDocsLinkInChangesets()) {
    console.log("Docs link found in changeset frontmatter");
    return;
  }

  if (hasIssueLinkInPRBody()) {
    console.log("Issue link to docs found in PR body");
    return;
  }

  throw new Error(
    "No links to docs found. Either:\n" +
      `- Add the '${SKIP_LABEL}' label\n` +
      "- Add a `# docs:` comment in your changeset frontmatter:\n\n" +
      "  ---\n" +
      "  # docs: https://github.com/NomicFoundation/hardhat-website/pull/<number>\n" +
      '  "package-name": patch\n' +
      "  ---\n\n" +
      "- Or link to a hardhat-website issue in the PR body",
  );
}

await validatePullRequest();
