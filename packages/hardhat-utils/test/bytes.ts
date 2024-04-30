import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { isBytes, setLengthLeft, toBytes, equalsBytes } from "../src/bytes.js";

describe("bytes", () => {
  describe("isBytes", () => {
    it("Should return true for Uint8Array", () => {
      assert.ok(isBytes(new Uint8Array()));
    });

    it("Should return true for Buffer", () => {
      assert.ok(isBytes(Buffer.alloc(0)));
    });

    it("Should return false for other types", () => {
      assert.ok(!isBytes(""));
      assert.ok(!isBytes(0));
      assert.ok(!isBytes(null));
      assert.ok(!isBytes(undefined));
    });
  });

  describe("setLengthLeft", () => {
    it("Should pad a Uint8Array with zeros on the left", () => {
      const bytes = new Uint8Array([0x01, 0x02, 0x03]);
      const padded = new Uint8Array([0x00, 0x01, 0x02, 0x03]);
      assert.deepEqual(setLengthLeft(bytes, 4), padded);
    });

    it("Should truncate a Uint8Array from the left", () => {
      const bytes = new Uint8Array([0x01, 0x02, 0x03]);
      const truncated = new Uint8Array([0x02, 0x03]);
      assert.deepEqual(setLengthLeft(bytes, 2), truncated);
    });

    it("Should return a copy of the Uint8Array if the length is the same", () => {
      const bytes = new Uint8Array([0x01, 0x02, 0x03]);
      assert.deepEqual(setLengthLeft(bytes, 3), bytes);
    });
  });

  describe("toBytes", () => {
    it("Should convert null to an empty Uint8Array", () => {
      assert.deepEqual(toBytes(null), new Uint8Array());
    });

    it("Should convert undefined to an empty Uint8Array", () => {
      assert.deepEqual(toBytes(undefined), new Uint8Array());
    });

    it("Should convert an array to a Uint8Array", () => {
      const array = [0x01, 0x02, 0x03];
      const bytes = new Uint8Array(array);
      assert.deepEqual(toBytes(array), bytes);
    });

    it("Should convert a Uint8Array to a Uint8Array", () => {
      const bytes = new Uint8Array([0x01, 0x02, 0x03]);
      assert.deepEqual(toBytes(bytes), bytes);
    });

    it("Should convert a Buffer to a Uint8Array", () => {
      const buffer = Buffer.from([0x01, 0x02, 0x03]);
      const bytes = new Uint8Array([0x01, 0x02, 0x03]);
      assert.deepEqual(toBytes(buffer), bytes);
    });

    it("Should convert a hexadecimal string to a Uint8Array", () => {
      const hexString = "0x010203";
      const bytes = new Uint8Array([0x01, 0x02, 0x03]);
      assert.deepEqual(toBytes(hexString), bytes);
    });

    it("Should convert a number to a Uint8Array", () => {
      const number = 66051;
      const bytes = new Uint8Array([0x01, 0x02, 0x03]);
      assert.deepEqual(toBytes(number), bytes);
    });

    it("Should convert a bigint to a Uint8Array", () => {
      const bigint = BigInt(66051);
      const bytes = new Uint8Array([0x01, 0x02, 0x03]);
      assert.deepEqual(toBytes(bigint), bytes);
    });

    it("Should throw an error for other types", () => {
      assert.throws(() => toBytes({} as any), {
        name: "InvalidParameterError",
        message: `Invalid parameter type. Expected null, undefined, number[], Uint8Array, string, number or bigint. Received type: ${typeof {}}`,
      });
    });
  });

  describe("equalsBytes", () => {
    it("Should return true for equal Uint8Arrays", () => {
      const bytes1 = new Uint8Array([0x01, 0x02, 0x03]);
      const bytes2 = new Uint8Array([0x01, 0x02, 0x03]);
      assert.ok(equalsBytes(bytes1, bytes2));
    });

    it("Should return false for different Uint8Arrays", () => {
      const bytes1 = new Uint8Array([0x01, 0x02, 0x03]);
      const bytes2 = new Uint8Array([0x01, 0x02, 0x04]);
      assert.ok(!equalsBytes(bytes1, bytes2));
    });

    it("Should return true for equal Uint8Array and Buffer", () => {
      const bytes = new Uint8Array([0x01, 0x02, 0x03]);
      const buffer = Buffer.from([0x01, 0x02, 0x03]);
      assert.ok(equalsBytes(bytes, buffer));
    });

    it("Should return false for different Uint8Array and Buffer", () => {
      const bytes1 = new Uint8Array([0x01, 0x02, 0x03]);
      const buffer = Buffer.from([0x01, 0x02, 0x04]);
      assert.ok(!equalsBytes(bytes1, buffer));
    });
  });
});
