import assert from "node:assert/strict";
import { describe, it } from "node:test";

describe("describe", () => {
  it("should pass", async () => {
    assert.equal(1, 1);
  });

  it("should pass, too", async () => {
    assert.equal(1, 1);
  });

  throw new Error("describe setup error");
});

describe("nested describe", () => {
  describe("level 1", () => {
    it("should pass", async () => {
      assert.equal(1, 1);
    });

    it("should pass, too", async () => {
      assert.equal(1, 1);
    });

    throw new Error("describe setup error");
  });
});
