import defaultChangelog from "@changesets/cli/changelog";
import githubChangelog from "@changesets/changelog-github";
import util from "node:util";

const hasGithubToken = process.env.GITHUB_TOKEN !== undefined;

if (!hasGithubToken) {
  console.log(
    util.styleText(["bold", "yellow"], "WARNING:"),
    "GITHUB_TOKEN is not set using default changelog locally",
  );
  console.log();
}

export default hasGithubToken ? githubChangelog : defaultChangelog;
