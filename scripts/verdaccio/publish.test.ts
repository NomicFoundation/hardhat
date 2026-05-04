import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { decidePublishAction } from "./publish.ts";

describe("decidePublishAction", () => {
  it("bumps when there is no release tag (new package)", () => {
    assert.equal(decidePublishAction(undefined, "0.1.0", false), "bump");
  });

  it("bumps when version matches tag and code changed since release", () => {
    assert.equal(decidePublishAction("3.3.0", "3.3.0", true), "bump");
  });

  it("skips when version matches tag and no code changes since release", () => {
    assert.equal(decidePublishAction("3.3.0", "3.3.0", false), "skip");
  });

  it("publishes without bumping when already bumped (no further changes)", () => {
    assert.equal(decidePublishAction("3.3.0", "3.3.1", false), "publish");
  });

  it("publishes without bumping when already bumped (with further changes)", () => {
    assert.equal(decidePublishAction("3.3.0", "3.3.1", true), "publish");
  });
});
