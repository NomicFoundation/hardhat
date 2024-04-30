import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { BigNumber } from "bignumber.js";
import BN from "bn.js";

import {
  min,
  max,
  toBigInt,
  isLibraryBigInt,
  signedBytesToBigInt,
} from "../src/bigint.js";

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
    it("Should convert a number to a BigInt", async () => {
      assert.equal(await toBigInt(0), 0n);
      assert.equal(await toBigInt(1), 1n);
      assert.equal(await toBigInt(-1), -1n);
    });

    it("Should convert a BigInt to a BigInt", async () => {
      assert.equal(await toBigInt(0n), 0n);
      assert.equal(await toBigInt(1n), 1n);
      assert.equal(await toBigInt(-1n), -1n);
    });

    it("Should convert a string to a BigInt", async () => {
      assert.equal(await toBigInt("0"), 0n);
      assert.equal(await toBigInt("1"), 1n);
      assert.equal(await toBigInt("-1"), -1n);
    });

    it("Should convert a BigNumber to a BigInt", async () => {
      assert.equal(await toBigInt(new BigNumber(0)), 0n);
      assert.equal(await toBigInt(new BigNumber(1)), 1n);
      assert.equal(await toBigInt(new BigNumber(-1)), -1n);
    });

    it("Should convert a BN to a BigInt", async () => {
      assert.equal(await toBigInt(new BN(0)), 0n);
      assert.equal(await toBigInt(new BN(1)), 1n);
      assert.equal(await toBigInt(new BN(-1)), -1n);
    });

    it("Should throw on non-integer numbers", async () => {
      await assert.rejects(toBigInt(0.5), {
        name: "BigIntError",
        message: "0.5 is not an integer",
      });
    });

    it("Should throw on unsafe integers", async () => {
      await assert.rejects(toBigInt(Number.MAX_SAFE_INTEGER + 1), {
        name: "BigIntError",
        message: `Integer ${Number.MAX_SAFE_INTEGER + 1} is unsafe. Consider using ${Number.MAX_SAFE_INTEGER + 1}n instead. For more details, see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/isSafeInteger`,
      });
    });

    it("Should throw on unsupported objects", async () => {
      await assert.rejects(toBigInt({} as any), {
        name: "BigIntError",
        message:
          'Value {} is of type "object" but is not an instanceof one of the known big number object types.',
      });
    });

    it("Should throw on unsupported types", async () => {
      await assert.rejects(toBigInt(true as any), {
        name: "BigIntError",
        message: "Unsupported type boolean",
      });
    });
  });

  describe("isLibraryBigInt", () => {
    it("Should return true for BigNumber", async () => {
      assert.ok(await isLibraryBigInt(new BigNumber(0)));
    });

    it("Should return true for BN", async () => {
      assert.ok(await isLibraryBigInt(new BN(0)));
    });

    it("Should return false for other objects", async () => {
      assert.ok(!(await isLibraryBigInt({})));
    });
  });

  describe("signedBytesToBigInt", () => {
    it("should convert an unsigned (negative) Uint8Array to a signed number", () => {
      const bytes = new Uint8Array(32);
      bytes[0] = 255; // Set the most significant bit to -1 in two's complement

      assert.equal(
        signedBytesToBigInt(bytes).toString(),
        "-452312848583266388373324160190187140051835877600158453279131187530910662656",
      );
    });

    it("should convert an unsigned (positive) Uint8Array to a signed number", () => {
      const bytes = new Uint8Array(32);
      bytes[0] = 1; // Set the most significant bit to 1

      assert.equal(
        signedBytesToBigInt(bytes).toString(),
        "452312848583266388373324160190187140051835877600158453279131187530910662656",
      );
    });
  });
});
