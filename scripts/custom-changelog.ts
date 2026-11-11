import defaultChangelog from "@changesets/cli/changelog";
import githubChangelog from "@changesets/changelog-github";
import util from "node:util";

type ChangelogFunctions = typeof githubChangelog;

/**
 * Whether a changeset's summary already credits someone with a
 * `Thanks @<user>` of its own, e.g. the author of an upstream change that the
 * PR merely ports.
 */
export function hasAuthoredThanks(summary: string): boolean {
  return /(?:^|\s)Thanks @[A-Za-z0-9-]+/.test(summary);
}

/**
 * Wraps a changelog so that a release line whose summary already thanks
 * someone doesn't get a second, generated `Thanks [@<PR author>](...)!` too.
 * The authored thanks wins, since it names who did the work.
 */
export function withAuthoredThanks(
  changelog: ChangelogFunctions,
): ChangelogFunctions {
  return {
    ...changelog,
    getReleaseLine: (changeset, type, options) =>
      changelog.getReleaseLine(
        changeset,
        type,
        hasAuthoredThanks(changeset.summary)
          ? { ...options, disableThanks: true }
          : options,
      ),
  };
}

const hasGithubToken = process.env.GITHUB_TOKEN !== undefined;

if (!hasGithubToken) {
  console.log(
    util.styleText(["bold", "yellow"], "WARNING:"),
    "GITHUB_TOKEN is not set using default changelog locally",
  );
  console.log();
}

// The default changelog adds no thanks, so there is nothing to suppress there.
export default hasGithubToken
  ? withAuthoredThanks(githubChangelog)
  : defaultChangelog;
