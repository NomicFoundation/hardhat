import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  toBigInt,
  toNumber,
  toRpcQuantity,
} from "../src/internal/conversion.js";

describe("conversion", () => {
  describe("toRpcQuantity", () => {
    it("should return 0x0 for every representation of zero", () => {
      for (const zero of [0, 0n, "0x0", "0x00", "0x000", "0x0000"]) {
        assert.equal(toRpcQuantity(zero), "0x0");
      }
    });

    it("should strip leading zeros from non-zero quantities", () => {
      assert.equal(toRpcQuantity("0x01"), "0x1");
      assert.equal(toRpcQuantity("0x0de0b6b3a7640000"), "0xde0b6b3a7640000");
      assert.equal(toRpcQuantity("0x0a"), "0xa");
    });

    it("should keep canonical quantities untouched", () => {
      assert.equal(toRpcQuantity(10), "0xa");
      assert.equal(toRpcQuantity(10n), "0xa");
      assert.equal(toRpcQuantity("0x10"), "0x10");
    });
  });

  describe("toNumber / toBigInt", () => {
    it("should convert zero-padded zero strings to 0", async () => {
      for (const zero of ["0x0", "0x00", "0x000"]) {
        assert.equal(toNumber(zero), 0);
        assert.equal(await toBigInt(zero), 0n);
      }
    });
  });
});
