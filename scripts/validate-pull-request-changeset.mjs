// @ts-check

/**
 * A pull request is valid if:
 * - it is a release PR (i.e. it's head ref starts with "changeset-release/")
 * - or it is labeled as "no changeset needed"
 * - or it has a changeset.
 */

import { exec as execSync } from "node:child_process";
import { promisify } from "node:util";

const CHANGESET_LABEL = "no changeset needed";

const exec = promisify(execSync);

const changesetDir = ".changeset";

function isReleasePR() {
  if (process.env.GITHUB_HEAD_REF === undefined) {
    throw new Error("GITHUB_HEAD_REF is not defined");
  }

  return process.env.GITHUB_HEAD_REF.startsWith("changeset-release/");
}

function hasNoChangesetNeededLabel() {
  if (process.env.GITHUB_EVENT_PULL_REQUEST_LABELS === undefined) {
    throw new Error("GITHUB_EVENT_PULL_REQUEST_LABELS is not defined");
  }

  const labels = JSON.parse(process.env.GITHUB_EVENT_PULL_REQUEST_LABELS);

  return labels.some(l => l.name === CHANGESET_LABEL);
}

async function hasChangeset() {
  if (process.env.GITHUB_BASE_REF === undefined) {
    throw new Error("GITHUB_BASE_REF is not defined");
  }

  const { stdout } = await exec(
    `git diff --name-only --diff-filter=A ${process.env.GITHUB_BASE_REF} -- ${changesetDir}`
  );

  const changesets = stdout.trim().split("\n")
    .filter((file) => file.endsWith(".md"));

  return changesets.length > 0;
}

async function validatePullRequest() {
  if (isReleasePR()) {
    console.log("Ignore changeset check for release PR.");
    return;
  }

  if (await hasNoChangesetNeededLabel()) {
    console.log(`The PR is labeled as '${CHANGESET_LABEL}'`);
    return;
  }

  if (await hasChangeset()) {
    console.log("Changeset found");
    return;
  }

  throw new Error("No changeset found");
}

await validatePullRequest();
