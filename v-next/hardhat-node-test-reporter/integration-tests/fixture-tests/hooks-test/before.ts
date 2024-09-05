import assert from "node:assert/strict";
import { before, describe, it } from "node:test";

describe("before", () => {
  before(() => {
    throw new Error("before hook error");
  });

  it("should pass", async () => {
    assert.equal(1, 1);
  });

  it("should pass, too", async () => {
    assert.equal(1, 1);
  });
});

describe("nested before", () => {
  describe("level 1", () => {
    before(() => {
      throw new Error("before hook error");
    });

    it("should pass", async () => {
      assert.equal(1, 1);
    });

    it("should pass, too", async () => {
      assert.equal(1, 1);
    });
  });
});
