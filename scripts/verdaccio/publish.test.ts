import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { shouldPublishSinceLastRelease } from "./publish.ts";

describe("shouldForcePublishSinceRelease", () => {
  it("publishes when there is no release tag (new package)", () => {
    assert.equal(
      shouldPublishSinceLastRelease(undefined, "0.1.0", false, false),
      true,
    );
  });

  it("publishes when version matches tag and code changed since release", () => {
    assert.equal(
      shouldPublishSinceLastRelease("3.3.0", "3.3.0", true, false),
      true,
    );
  });

  it("skips when version matches tag and no code changes since release", () => {
    assert.equal(
      shouldPublishSinceLastRelease("3.3.0", "3.3.0", false, false),
      false,
    );
  });

  it("skips when already bumped and no new uncommitted changes", () => {
    assert.equal(
      shouldPublishSinceLastRelease("3.3.0", "3.3.1", true, false),
      false,
    );
  });

  it("publishes when already bumped but has new uncommitted changes", () => {
    assert.equal(
      shouldPublishSinceLastRelease("3.3.0", "3.3.1", true, true),
      true,
    );
  });
});
