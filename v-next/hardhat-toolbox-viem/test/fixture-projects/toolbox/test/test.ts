import assert from "node:assert/strict";
import { describe, it } from "node:test";

describe("NodeJs builtin test runner", async function () {
  it("should pass the test", () => {
    assert.equal(1, 1);
  });
});
