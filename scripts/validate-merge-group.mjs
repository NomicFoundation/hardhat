// @ts-check

/**
 * A merge group can contain multiple PRs at once - to proceed the merge group should be either:
 * 1. Only a release PR (+ no changeset changes PRs)
 * 2. A collection of standard feature PRs (+ no changeset changes PRs)
 *
 * If the merge group has no changesets but there are unreleased packages (version locally is higher than NPM), we know we have only a Release PR.
 * If the there are changesets, but all versions locally match NPM, then we have a collection of standard feature PRs - and no Release PR.
 * We are only invalid if we have both changesets and unreleased packages. This indicates a Release PR is being unintentionally mixed with a new Feature PR - we throw on this case.
 */

import { readAllNewChangsets } from "./lib/changesets.mjs";
import {
  isPackageReleasedToNpm,
  readAllReleasablePackages,
} from "./lib/packages.mjs";

// NOTE: This function is currently unused but it could be useful to preserve
// the information about how to do it.
function getPullNumber(headRef) {
  // The head ref (github.event.merge_group.head_ref) is of the form:
  // refs/heads/gh-readonly-queue/master/pr-6-90b00e094e6de7fc4f3fac9a0087c01cf48acad8
  const [, _baseRefName, pullNumber, _headSha] = headRef.match(
    /^refs\/heads\/gh-readonly-queue\/([^\/]+)\/pr-(\d+)-([a-z0-9]+)$/
  );
  return parseInt(pullNumber, 10);
}

async function validateMergeGroup() {
  const changesets = await readAllNewChangsets();

  if (changesets.length === 0) {
    console.log("No new changesets found");
    return;
  }

  const packages = await readAllReleasablePackages();

  for (const pkg of packages) {
    if (!(await isPackageReleasedToNpm(pkg.name, pkg.version))) {
      throw new Error(`Package ${pkg.name} is not released to npm`);
    }
  }

  console.log("All packages are released to npm");
  return;
}

await validateMergeGroup();
