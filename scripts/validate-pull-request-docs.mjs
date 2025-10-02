// @ts-check

/**
 * A pull request is valid if:
 * - it is a release PR (i.e. it's head ref starts with "changeset-release/")
 * - or it is labeled as "no docs needed"
 * - or it links to a pr/issue on the hardhat-website repo.
 */

const SKIP_LABEL = "no docs needed";

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

function hasLinksToDocs() {
  const prBody = process.env.GITHUB_EVENT_PULL_REQUEST_BODY;

  if (prBody === undefined) {
    throw new Error("GITHUB_EVENT_PULL_REQUEST_BODY is not defined");
  }

  console.log(JSON.stringify({ prBody }, null, 2));

  return (
    prBody.includes("github.com/NomicFoundation/hardhat-website/issues") ||
    prBody.includes("github.com/NomicFoundation/hardhat-website/pull")
  );
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

  if (hasLinksToDocs()) {
    console.log("Links to docs found");
    return;
  }

  throw new Error("No links to docs found");
}

await validatePullRequest();
