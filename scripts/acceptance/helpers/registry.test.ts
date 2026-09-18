import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { assertPublishedSomething } from "./registry.ts";

describe("assertPublishedSomething", () => {
  it("accepts a summary listing published packages", () => {
    assert.doesNotThrow(() =>
      assertPublishedSomething({
        publishedPackages: [{ name: "hardhat", version: "3.18.0" }],
      }),
    );
  });

  it("rejects an empty summary, explaining why it is empty", () => {
    assert.throws(
      () => assertPublishedSomething({ publishedPackages: [] }),
      /Nothing was published[\s\S]*release branch[\s\S]*--since-release/,
    );
  });
});
