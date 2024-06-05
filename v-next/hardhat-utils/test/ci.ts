import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { isCI } from "../src/ci.js";

describe("ci", () => {
  it("should be true because the ENV variable CI is true", async function () {
    process.env.CI = "true";
    assert.equal(isCI(), true);
  });

  it("should be false because the ENV variable CI is false", async function () {
    process.env.CI = "false";
    assert.equal(isCI(), false);
  });

  it("should be false because the ENV variable CI is undefined", async function () {
    assert.equal(isCI(), false);
  });
});
