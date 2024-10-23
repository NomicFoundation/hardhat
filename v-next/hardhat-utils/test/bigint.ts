import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { min, max, toBigInt } from "../src/bigint.js";

describe("bigint", () => {
  describe("min", () => {
    it("Should return the smaller of two numbers", () => {
      assert.equal(min(-1n, -1n), -1n);
      assert.equal(min(0n, 0n), 0n);
      assert.equal(min(1n, 1n), 1n);

      assert.equal(min(-1n, 0n), -1n);
      assert.equal(min(0n, -1n), -1n);

      assert.equal(min(-1n, 1n), -1n);
      assert.equal(min(1n, -1n), -1n);

      assert.equal(min(0n, 1n), 0n);
      assert.equal(min(1n, 0n), 0n);
    });
  });

  describe("max", () => {
    it("Should return the larger of two numbers", () => {
      assert.equal(max(-1n, -1n), -1n);
      assert.equal(max(0n, 0n), 0n);
      assert.equal(max(1n, 1n), 1n);

      assert.equal(max(-1n, 0n), 0n);
      assert.equal(max(0n, -1n), 0n);

      assert.equal(max(-1n, 1n), 1n);
      assert.equal(max(1n, -1n), 1n);

      assert.equal(max(0n, 1n), 1n);
      assert.equal(max(1n, 0n), 1n);
    });
  });

  describe("toBigInt", () => {
    it("Should convert a number to a BigInt", () => {
      assert.equal(toBigInt(0), 0n);
      assert.equal(toBigInt(1), 1n);
      assert.equal(toBigInt(-1), -1n);
    });

    it("Should convert a BigInt to a BigInt", () => {
      assert.equal(toBigInt(0n), 0n);
      assert.equal(toBigInt(1n), 1n);
      assert.equal(toBigInt(-1n), -1n);
    });

    it("Should convert a string to a BigInt", () => {
      assert.equal(toBigInt("0"), 0n);
      assert.equal(toBigInt("1"), 1n);
      assert.equal(toBigInt("-1"), -1n);
    });

    it("Should throw on non-integer numbers", () => {
      assert.throws(() => toBigInt(0.5), {
        name: "InvalidParameterError",
        message: "0.5 is not an integer",
      });
    });

    it("Should throw on unsafe integers", () => {
      assert.throws(() => toBigInt(Number.MAX_SAFE_INTEGER + 1), {
        name: "InvalidParameterError",
        message: `Integer ${Number.MAX_SAFE_INTEGER + 1} is unsafe. Consider using ${Number.MAX_SAFE_INTEGER + 1}n instead. For more details, see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/isSafeInteger`,
      });
    });

    it("Should throw on unsupported types", () => {
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- Intentionally testing an type mismatch
      assert.throws(() => toBigInt(true as any), {
        name: "InvalidParameterError",
        message: "Unsupported type: boolean",
      });
    });
  });
});
