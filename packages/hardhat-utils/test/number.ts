import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { bytesToNumber, numberToBytes } from "../src/number.js";

describe("number", () => {
  describe("bytesToNumber", () => {
    it("Should convert a Uint8Array to a number", () => {
      const bytes = new Uint8Array([0x01, 0x02, 0x03]);
      assert.equal(bytesToNumber(bytes), 66051);
    });

    it("Should convert a Uint8Array to a bigint", () => {
      // for bytesToNumber to convert to bigint, the number has to be larger
      // than Number.MAX_SAFE_INTEGER
      const bytes = new Uint8Array([0x20, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]); // Number.MAX_SAFE_INTEGER + 1
      assert.equal(bytesToNumber(bytes), BigInt(Number.MAX_SAFE_INTEGER + 1));
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
