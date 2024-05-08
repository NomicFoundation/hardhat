import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { bytesToBigInt, numberToBytes } from "../src/number.js";

describe("number", () => {
  describe("bytesToNumber", () => {
    it("Should convert a Uint8Array to a number", () => {
      const bytes = new Uint8Array([0x01, 0x02, 0x03]);
      assert.equal(bytesToBigInt(bytes), 66051n);
    });
  });

  describe("numberToBytes", () => {
    it("Should convert a number to a Uint8Array", () => {
      const value = 66051;
      const bytes = new Uint8Array([0x01, 0x02, 0x03]);
      assert.equal(numberToBytes(value).toString(), bytes.toString());
    });

    it("Should convert a bigint to a Uint8Array", () => {
      const value = BigInt(Number.MAX_SAFE_INTEGER + 1);
      const bytes = new Uint8Array([0x20, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);
      assert.deepEqual(numberToBytes(value).toString(), bytes.toString());
    });
  });
});
