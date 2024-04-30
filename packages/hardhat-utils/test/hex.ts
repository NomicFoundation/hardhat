import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  numberToHexString,
  hexStringToNumber,
  bytesToHexString,
  hexStringToBytes,
  normalizeHexString,
  isHexStringPrefixed,
  isHexString,
  getUnprefixedHexString,
  unpadHexString,
} from "../src/hex.js";

describe("hex", () => {
  describe("numberToHexString", () => {
    it("Should convert a number to a hexadecimal string", () => {
      assert.equal(numberToHexString(0), "0x0");
      assert.equal(numberToHexString(1), "0x1");
      assert.equal(numberToHexString(15), "0xf");
      assert.equal(numberToHexString(16), "0x10");
      assert.equal(numberToHexString(255), "0xff");
      assert.equal(numberToHexString(256), "0x100");
      assert.equal(numberToHexString(65535), "0xffff");
      assert.equal(numberToHexString(65536), "0x10000");
      assert.equal(numberToHexString(4294967295), "0xffffffff");
      assert.equal(numberToHexString(4294967296), "0x100000000");
      assert.equal(
        numberToHexString(Number.MAX_SAFE_INTEGER),
        "0x1fffffffffffff",
      );

      assert.equal(numberToHexString(0n), "0x0");
      assert.equal(numberToHexString(1n), "0x1");
      assert.equal(numberToHexString(15n), "0xf");
      assert.equal(numberToHexString(16n), "0x10");
      assert.equal(numberToHexString(255n), "0xff");
      assert.equal(numberToHexString(256n), "0x100");
      assert.equal(numberToHexString(65535n), "0xffff");
      assert.equal(numberToHexString(65536n), "0x10000");
      assert.equal(numberToHexString(4294967295n), "0xffffffff");
      assert.equal(numberToHexString(4294967296n), "0x100000000");
      assert.equal(
        numberToHexString(BigInt(Number.MAX_SAFE_INTEGER)),
        "0x1fffffffffffff",
      );
      assert.equal(
        numberToHexString(BigInt(Number.MAX_SAFE_INTEGER) + 1n),
        "0x20000000000000",
      );
    });

    it("Should throw InvalidParameterError if the input is not a safe integer or is negative", () => {
      assert.throws(() => numberToHexString(-1), {
        name: "InvalidParameterError",
        message: "Expected a non-negative safe integer or bigint. Received: -1",
      });

      assert.throws(() => numberToHexString(-1n), {
        name: "InvalidParameterError",
        message: "Expected a non-negative safe integer or bigint. Received: -1",
      });

      const unsafeInt = Number.MAX_SAFE_INTEGER + 1;
      assert.throws(() => numberToHexString(unsafeInt), {
        name: "InvalidParameterError",
        message: `Expected a non-negative safe integer or bigint. Received: ${unsafeInt}`,
      });
    });
  });

  describe("hexStringToNumber", () => {
    it("Should convert a hexadecimal string to a number", () => {
      assert.equal(hexStringToNumber("0x0"), 0);
      assert.equal(hexStringToNumber("0x1"), 1);
      assert.equal(hexStringToNumber("0xf"), 15);
      assert.equal(hexStringToNumber("0x10"), 16);
      assert.equal(hexStringToNumber("0xff"), 255);
      assert.equal(hexStringToNumber("0x100"), 256);
      assert.equal(hexStringToNumber("0xffff"), 65535);
      assert.equal(hexStringToNumber("0x10000"), 65536);
      assert.equal(hexStringToNumber("0xffffffff"), 4294967295);
      assert.equal(hexStringToNumber("0x100000000"), 4294967296);
      assert.equal(
        hexStringToNumber("0x1fffffffffffff"),
        Number.MAX_SAFE_INTEGER,
      );

      assert.equal(
        hexStringToNumber("0x20000000000000"),
        BigInt(Number.MAX_SAFE_INTEGER) + 1n,
      );
    });

    it("Should throw InvalidParameterError if the input is not a hexadecimal string", () => {
      assert.throws(() => hexStringToNumber("invalid"), {
        name: "InvalidParameterError",
        message:
          "Expected a hexadecimal string starting with '0x'. Received: invalid",
      });
    });
  });

  describe("bytesToHexString", () => {
    it("Should convert a Uint8Array to a hexadecimal string", () => {
      assert.equal(bytesToHexString(new Uint8Array([])), "0x");
      assert.equal(bytesToHexString(new Uint8Array([0])), "0x00");
      assert.equal(bytesToHexString(new Uint8Array([1])), "0x01");
      assert.equal(bytesToHexString(new Uint8Array([15])), "0x0f");
      assert.equal(bytesToHexString(new Uint8Array([16])), "0x10");
      assert.equal(bytesToHexString(new Uint8Array([255])), "0xff");
      assert.equal(
        bytesToHexString(new Uint8Array([0x01, 0x02, 0x03])),
        "0x010203",
      );
      assert.equal(
        bytesToHexString(new Uint8Array([0, 1, 15, 16, 255])),
        "0x00010f10ff",
      );

      // it should work with Buffer
      assert.equal(bytesToHexString(Buffer.from([])), "0x");
      assert.equal(bytesToHexString(Buffer.from([0])), "0x00");
      assert.equal(bytesToHexString(Buffer.from([1])), "0x01");
      assert.equal(bytesToHexString(Buffer.from([15])), "0x0f");
      assert.equal(bytesToHexString(Buffer.from([16])), "0x10");
      assert.equal(bytesToHexString(Buffer.from([255])), "0xff");
      assert.equal(
        bytesToHexString(Buffer.from([0x01, 0x02, 0x03])),
        "0x010203",
      );
      assert.equal(
        bytesToHexString(Buffer.from([0, 1, 15, 16, 255])),
        "0x00010f10ff",
      );
    });
  });

  describe("hexStringToBytes", () => {
    it("Should convert a hexadecimal string to a Uint8Array", () => {
      assert.deepEqual(hexStringToBytes("0x"), new Uint8Array([]));
      assert.deepEqual(hexStringToBytes("0x00"), new Uint8Array([0]));
      assert.deepEqual(hexStringToBytes("0x01"), new Uint8Array([1]));
      assert.deepEqual(hexStringToBytes("0x0f"), new Uint8Array([15]));
      assert.deepEqual(hexStringToBytes("0x10"), new Uint8Array([16]));
      assert.deepEqual(hexStringToBytes("0xff"), new Uint8Array([255]));
      assert.deepEqual(
        hexStringToBytes("0x010203"),
        new Uint8Array([0x01, 0x02, 0x03]),
      );
      assert.deepEqual(
        hexStringToBytes("0x00010f10ff"),
        new Uint8Array([0, 1, 15, 16, 255]),
      );
    });

    it("Should throw InvalidParameterError if the input is not a hexadecimal string", () => {
      assert.throws(() => hexStringToBytes("invalid"), {
        name: "InvalidParameterError",
        message:
          "Expected a hexadecimal string starting with '0x'. Received: invalid",
      });
    });
  });

  describe("normalizeHexString", () => {
    it("Should normalize a hexadecimal string", () => {
      assert.equal(normalizeHexString("0x0"), "0x0");
      assert.equal(normalizeHexString("        0x1"), "0x1");
      assert.equal(normalizeHexString("0xf           "), "0xf");
      assert.equal(normalizeHexString("  0x10  "), "0x10");
      assert.equal(normalizeHexString("  Ff    "), "0xff");
      assert.equal(normalizeHexString("0x100"), "0x100");
      assert.equal(normalizeHexString("   FFFF"), "0xffff");
      assert.equal(normalizeHexString("0x10000"), "0x10000");
      assert.equal(normalizeHexString("ffFFfFFf   "), "0xffffffff");
      assert.equal(normalizeHexString("0x100000000"), "0x100000000");
      assert.equal(normalizeHexString("0x1fffffffffffff"), "0x1fffffffffffff");
      assert.equal(normalizeHexString("20000000000000"), "0x20000000000000");
    });
  });

  describe("isHexStringPrefixed", () => {
    it("Should check if a string is prefixed with '0x'", () => {
      assert.equal(isHexStringPrefixed("0x0"), true);
      assert.equal(isHexStringPrefixed("ffff"), false);
      assert.equal(isHexStringPrefixed("0X100000000"), true);
      assert.equal(isHexStringPrefixed("20000000000000"), false);
    });
  });

  describe("isHexString", () => {
    it("Should check if a string is a hexadecimal string", () => {
      assert.equal(isHexString("0x0"), true);
      assert.equal(isHexString("0xFFff"), true);
      assert.equal(isHexString(" 0x10000 "), true);
      assert.equal(isHexString("0X1000000Ff      "), true);
      assert.equal(isHexString("20000000000000"), false);
      assert.equal(isHexString("invalid"), false);
      assert.equal(isHexString(10), false);
      assert.equal(isHexString(true), false);
      assert.equal(isHexString({}), false);
    });
  });

  describe("getUnprefixedHexString", () => {
    it("Should remove the '0x' prefix from a hexadecimal string", () => {
      assert.equal(getUnprefixedHexString("0x0"), "0");
      assert.equal(getUnprefixedHexString("0xFFff"), "FFff");
      assert.equal(getUnprefixedHexString("0X1000000Ff"), "1000000Ff");
      assert.equal(getUnprefixedHexString("20000000000000"), "20000000000000");
    });
  });

  describe("unpadHexString", () => {
    it("Should remove leading zeros from a hexadecimal string", () => {
      assert.equal(unpadHexString("0x0"), "0x0");
      assert.equal(unpadHexString("0x00"), "0x0");
      assert.equal(unpadHexString("0x00000000000000"), "0x0");
      assert.equal(unpadHexString("0x01"), "0x1");
      assert.equal(unpadHexString("0x0000000000"), "0x0");
      assert.equal(unpadHexString("0X0000000001"), "0x1");
    });
  });
});
