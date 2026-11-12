import assert from "node:assert/strict";
import { describe, it } from "node:test";

import githubChangelog from "@changesets/changelog-github";

import { hasAuthoredThanks, withAuthoredThanks } from "./custom-changelog.ts";

const options = { repo: "NomicFoundation/hardhat" };

// An `author:` line makes `@changesets/changelog-github` generate its thanks
// from the summary instead of asking GitHub who opened the PR, and with no PR
// or commit to look up it makes no requests at all.
function changeset(summary: string) {
  return {
    id: "edr-amsterdam-eip-8038",
    summary: `author: kanej\n${summary}`,
    releases: [{ name: "hardhat", type: "minor" as const }],
  };
}

describe("custom changelog", () => {
  describe("hasAuthoredThanks", () => {
    it("should detect a thanks at the start of the summary", () => {
      assert.equal(hasAuthoredThanks("Thanks @contributor! Added X."), true);
    });

    it("should detect a thanks after other text", () => {
      assert.equal(
        hasAuthoredThanks(
          "Added X.\n\nThanks @another-contributor for the fix!",
        ),
        true,
      );
    });

    it("should not treat a summary without a thanks as having one", () => {
      assert.equal(hasAuthoredThanks("Added X."), false);
    });

    it("should not treat an unrelated mention as a thanks", () => {
      assert.equal(
        hasAuthoredThanks("Added X, see @nomicfoundation/edr."),
        false,
      );
    });

    it("should not treat thanks without a handle as a thanks", () => {
      assert.equal(
        hasAuthoredThanks("Thanks to everyone who reported it."),
        false,
      );
    });
  });

  describe("withAuthoredThanks", () => {
    const changelog = withAuthoredThanks(githubChangelog);

    it("should drop the generated thanks when the summary has its own", async () => {
      const summary = "Thanks @contributor! Added X.";

      assert.equal(
        await githubChangelog.getReleaseLine(
          changeset(summary),
          "minor",
          options,
        ),
        "\n\n- Thanks [@kanej](https://github.com/kanej)! - Thanks @contributor! Added X.\n",
        "the unwrapped changelog thanks twice",
      );
      assert.equal(
        await changelog.getReleaseLine(changeset(summary), "minor", options),
        "\n\n- Thanks @contributor! Added X.\n",
      );
    });

    it("should keep the generated thanks when the summary has none", async () => {
      assert.equal(
        await changelog.getReleaseLine(changeset("Added X."), "minor", options),
        "\n\n- Thanks [@kanej](https://github.com/kanej)! - Added X.\n",
      );
    });

    it("should leave the dependency release lines alone", () => {
      assert.equal(
        changelog.getDependencyReleaseLine,
        githubChangelog.getDependencyReleaseLine,
      );
    });
  });
});
