// @ts-check

/**
 * A pull request is valid if:
 * - it is a release PR (i.e. it's head ref starts with "changeset-release/")
 * - or it is labeled as "no-peer-bump-needed"
 * - or it modifies .peer-bumps.json.
 */

import { exec as execSync } from "node:child_process";
import { promisify } from "node:util";

const PEER_BUMP_LABEL = "no-peer-bump-needed";

const exec = promisify(execSync);

const peerBumpsFile = ".peer-bumps.json";

function isReleasePR() {
  if (process.env.GITHUB_HEAD_REF === undefined) {
    throw new Error("GITHUB_HEAD_REF is not defined");
  }

  return process.env.GITHUB_HEAD_REF.startsWith("changeset-release/");
}

function hasNoPeerBumpNeededLabel() {
  if (process.env.GITHUB_EVENT_PULL_REQUEST_LABELS === undefined) {
    throw new Error("GITHUB_EVENT_PULL_REQUEST_LABELS is not defined");
  }

  const labels = JSON.parse(process.env.GITHUB_EVENT_PULL_REQUEST_LABELS);

  return labels.some((l) => l.name === PEER_BUMP_LABEL);
}

async function hasPeerBumpEntry() {
  if (process.env.GITHUB_BASE_REF === undefined) {
    throw new Error("GITHUB_BASE_REF is not defined");
  }

  const { stdout } = await exec(
    `git diff --name-only ${process.env.GITHUB_BASE_REF} -- ${peerBumpsFile}`
  );

  return stdout.trim().length > 0;
}

async function validatePullRequest() {
  if (isReleasePR()) {
    console.log("Ignore peer bump check for release PR.");
    return;
  }

  if (hasNoPeerBumpNeededLabel()) {
    console.log(`The PR is labeled as '${PEER_BUMP_LABEL}'`);
    return;
  }

  if (await hasPeerBumpEntry()) {
    console.log("Peer bump entry found");
    return;
  }

  throw new Error(
    `No peer bump entry found. Either modify ${peerBumpsFile} or add the '${PEER_BUMP_LABEL}' label to this PR.`
  );
}

await validatePullRequest();
