// @ts-check

/**
 * This checks that the release PR has the "peer dependencies reviewed" label,
 * to enforce the manual check on version specifiers before a release.
 */

const REVIEWED_LABEL = "peer dependencies reviewed";

function hasReviewedLabel() {
  if (process.env.GITHUB_EVENT_PULL_REQUEST_LABELS === undefined) {
    throw new Error("GITHUB_EVENT_PULL_REQUEST_LABELS is not defined");
  }

  const labels = JSON.parse(process.env.GITHUB_EVENT_PULL_REQUEST_LABELS);

  return labels.some((l) => l.name === REVIEWED_LABEL);
}

async function validatePullRequest() {
  if (hasReviewedLabel()) {
    console.log(`The PR is labeled as '${REVIEWED_LABEL}'`);
    return;
  }

  throw new Error(
    `Peer dependencies are not reviewed. Add the '${REVIEWED_LABEL}' label to this PR once peer dependency version ranges have been manually reviewed.`
  );
}

await validatePullRequest();
