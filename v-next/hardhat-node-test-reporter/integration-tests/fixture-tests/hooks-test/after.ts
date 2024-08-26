import assert from "node:assert/strict";
import { after, describe, it } from "node:test";

describe("after", () => {
  after(() => {
    throw new Error("after hook error");
  });

  it("should pass", async () => {
    assert.equal(1, 1);
  });

  it("should pass, too", async () => {
    assert.equal(1, 1);
  });
});
