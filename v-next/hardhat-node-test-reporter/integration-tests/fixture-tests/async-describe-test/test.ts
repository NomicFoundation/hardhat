import assert from "node:assert/strict";
import { describe, it } from "node:test";

describe("async describe with promise 1", async () => {
  const one = await new Promise((resolve) => setTimeout(() => resolve(1), 0));

  it("should pass 1", async () => {
    assert.equal(one, 1);
  });

  describe("nested async describe with promise 1", async () => {
    const two = await new Promise((resolve) => setTimeout(() => resolve(2), 0));

    it("should pass 2", async () => {
      assert.equal(two, 2);
    });
  });

  describe("nested async describe 1", async () => {
    it("should pass 3", async () => {
      assert.equal(one, 1);
    });
  });

  describe("nested describe 1", () => {
    it("should pass 4", async () => {
      assert.equal(one, 1);
    });
  });
});

describe("async describe", async () => {
  it("should pass 5", async () => {
    assert.equal(1, 1);
  });

  describe("nested async describe with promise 2", async () => {
    const two = await new Promise((resolve) => setTimeout(() => resolve(2), 0));

    it("should pass 6", async () => {
      assert.equal(two, 2);
    });
  });

  describe("nested async describe 2", async () => {
    it("should pass 7", async () => {
      assert.equal(1, 1);
    });
  });

  describe("nested describe 2", () => {
    it("should pass 8", async () => {
      assert.equal(1, 1);
    });
  });
});
