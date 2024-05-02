import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { isBytes, setLengthLeft, equalsBytes } from "../src/bytes.js";

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
