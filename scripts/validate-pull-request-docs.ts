import { exec as execCb } from "node:child_process";
import { readFile } from "node:fs/promises";
import process from "node:process";
import { promisify } from "node:util";

import {
  parseFrontMatter,
  extractDocsUrlsFromFrontMatter,
} from "./lib/changesets.ts";

/**
 * A pull request is valid if:
 * - it is a release PR (i.e. its head ref starts with "changeset-release/")
 * - or it is labeled as "no docs needed"
 * - or it has a `# docs:` URL in a changeset frontmatter pointing to a hardhat-website PR
 * - or the PR body links to a hardhat-website issue
 *
 * A pull request FAILS if the PR body contains a hardhat-website /pull/ link
 * that is not also referenced by a `# docs:` comment in a changeset frontmatter.
 */

const exec = promisify(execCb);

const SKIP_LABEL = "no docs needed";
const changesetDir = ".changeset";

const DOCS_PR_URL_PATTERN =
  /github\.com\/nomicfoundation\/hardhat-website\/pull\/\d+/i;

const DOCS_PR_URL_PATTERN_GLOBAL = new RegExp(DOCS_PR_URL_PATTERN.source, "gi");

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

  return labels.some((l: { name: string }) => l.name === SKIP_LABEL);
}

function extractDocsUrlsFromPRBody(): string[] {
  const prBody = process.env.GITHUB_EVENT_PULL_REQUEST_BODY;

  if (prBody === undefined) {
    throw new Error("GITHUB_EVENT_PULL_REQUEST_BODY is not defined");
  }

  return prBody.match(DOCS_PR_URL_PATTERN_GLOBAL) ?? [];
}

function hasIssueLinkInPRBody() {
  const prBody = process.env.GITHUB_EVENT_PULL_REQUEST_BODY;

  if (prBody === undefined) {
    throw new Error("GITHUB_EVENT_PULL_REQUEST_BODY is not defined");
  }

  return /github\.com\/nomicfoundation\/hardhat-website\/issues\/\d+/i.test(
    prBody,
  );
}

async function collectDocsUrlsFromChangesets(): Promise<string[]> {
  if (process.env.GITHUB_BASE_REF === undefined) {
    throw new Error("GITHUB_BASE_REF is not defined");
  }

  const { stdout } = await exec(
    `git diff --name-only --diff-filter=d ${process.env.GITHUB_BASE_REF} -- ${changesetDir}`,
  );

  const changesetFiles = stdout
    .trim()
    .split("\n")
    .filter((file) => file.endsWith(".md"));

  const urls: string[] = [];
  for (const file of changesetFiles) {
    const content = await readFile(file, "utf-8");
    const { frontMatter } = parseFrontMatter(content);
    urls.push(...extractDocsUrlsFromFrontMatter(frontMatter));
  }
  return urls;
}

function normalizeDocsUrl(url: string): string {
  const match = url.match(DOCS_PR_URL_PATTERN);
  return (match !== null ? match[0] : url).toLowerCase();
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

  const bodyUrls = extractDocsUrlsFromPRBody();
  const changesetUrls = await collectDocsUrlsFromChangesets();
  const changesetUrlSet = new Set(changesetUrls.map(normalizeDocsUrl));

  const unmatchedBodyUrls = bodyUrls.filter(
    (url) => !changesetUrlSet.has(normalizeDocsUrl(url)),
  );

  if (unmatchedBodyUrls.length > 0) {
    throw new Error(
      "Found hardhat-website PR link(s) in the PR body that are not referenced in any changeset:\n" +
        unmatchedBodyUrls.map((u) => `  - ${u}`).join("\n") +
        "\n\n" +
        "Add a `# docs:` comment for each in a changeset frontmatter:\n\n" +
        "  ---\n" +
        "  # docs: https://github.com/NomicFoundation/hardhat-website/pull/<number>\n" +
        '  "package-name": patch\n' +
        "  ---",
    );
  }

  if (changesetUrls.length > 0) {
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
