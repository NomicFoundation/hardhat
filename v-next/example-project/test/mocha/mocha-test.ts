import assert from "node:assert/strict";
import { describe, it } from "mocha";

describe("Mocha test", () => {
  it("should work", () => {
    assert.equal(1 + 1, 2);
  });
});
