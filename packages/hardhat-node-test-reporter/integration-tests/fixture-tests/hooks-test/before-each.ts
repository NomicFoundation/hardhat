import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";

describe("before each", () => {
  beforeEach(() => {
    throw new Error("before each hook error");
  });

  it("should pass", async () => {
    assert.equal(1, 1);
  });

  it("should pass, too", async () => {
    assert.equal(1, 1);
  });
});
