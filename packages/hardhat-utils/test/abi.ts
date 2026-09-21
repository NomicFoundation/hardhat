import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { getIntTypeRange, parseIntType } from "../src/abi.js";

describe("abi", () => {
  describe("parseIntType", () => {
    it("Should parse the explicitly sized types", () => {
      assert.deepEqual(parseIntType("uint8"), { signed: false, bits: 8 });
      assert.deepEqual(parseIntType("uint256"), { signed: false, bits: 256 });
      assert.deepEqual(parseIntType("int8"), { signed: true, bits: 8 });
      assert.deepEqual(parseIntType("int128"), { signed: true, bits: 128 });
      assert.deepEqual(parseIntType("int256"), { signed: true, bits: 256 });
    });

    it("Should treat uint and int as aliases of the 256-bit types", () => {
      assert.deepEqual(parseIntType("uint"), { signed: false, bits: 256 });
      assert.deepEqual(parseIntType("int"), { signed: true, bits: 256 });
    });

    it("Should return undefined if the bit count is not a multiple of 8", () => {
      assert.equal(parseIntType("uint7"), undefined);
      assert.equal(parseIntType("int1"), undefined);
      assert.equal(parseIntType("uint255"), undefined);
    });

    it("Should return undefined if the bit count exceeds 256", () => {
      assert.equal(parseIntType("uint264"), undefined);
      assert.equal(parseIntType("int512"), undefined);
    });

    it("Should return undefined for types that are not Solidity integers", () => {
      assert.equal(parseIntType(""), undefined);
      assert.equal(parseIntType("address"), undefined);
      assert.equal(parseIntType("bool"), undefined);
      assert.equal(parseIntType("bytes32"), undefined);
      assert.equal(parseIntType("string"), undefined);
      assert.equal(parseIntType("uint256[]"), undefined);
      assert.equal(parseIntType("Uint256"), undefined);
      assert.equal(parseIntType("uint0"), undefined);
      assert.equal(parseIntType("uint08"), undefined);
      assert.equal(parseIntType("uint-8"), undefined);
    });
  });

  describe("getIntTypeRange", () => {
    it("Should return the range of the unsigned types", () => {
      assert.deepEqual(getIntTypeRange({ signed: false, bits: 8 }), {
        min: 0n,
        max: 255n,
      });
      assert.deepEqual(getIntTypeRange({ signed: false, bits: 256 }), {
        min: 0n,
        max: 2n ** 256n - 1n,
      });
    });

    it("Should return the range of the signed types", () => {
      assert.deepEqual(getIntTypeRange({ signed: true, bits: 8 }), {
        min: -128n,
        max: 127n,
      });
      assert.deepEqual(getIntTypeRange({ signed: true, bits: 256 }), {
        min: -(2n ** 255n),
        max: 2n ** 255n - 1n,
      });
    });
  });
});
