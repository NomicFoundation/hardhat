import assert from "node:assert/strict";
import { describe, it } from "node:test";

describe("assert", () => {
  describe("equal", () => {
    it("should compare numbers", () => {
      assert.equal(1, 2);
    });
    it("should compare booleans", () => {
      assert.equal(true, false);
    });
    it("should compare strings", () => {
      assert.equal("hello", "world");
    });
    it("should compare strings (with substring matching)", () => {
      assert.equal("CustomError1", "CustomErrorWithInt1");
    });
    it("should compare numbers and strings", () => {
      assert.equal(1, "1");
    });
  });
  describe("deepEqual", () => {
    it("should compare objects", () => {
      assert.deepEqual(
        { a: 1, b: { c: true, d: "hello" } },
        { a: 2, b: { c: false, d: "world" } },
      );
    });
    it("should compare arrays", () => {
      assert.deepEqual(
        [1, true, "hello", { a: 1, b: { c: 1 } }],
        [2, false, "world", { a: 2, b: { c: 2 } }],
      );
    });
  });
  describe("match", () => {
    it("should match strings", () => {
      assert.match("hello", /world/);
    });
  });
});
