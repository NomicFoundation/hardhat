import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";

describe("after each", () => {
  afterEach(() => {
    throw new Error("after each hook error");
  });

  it("should pass", async () => {
    assert.equal(1, 1);
  });

  it("should pass, too", async () => {
    assert.equal(1, 1);
  });
});
