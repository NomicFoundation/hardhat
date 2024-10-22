import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  numberToHexString,
  hexStringToBigInt,
  bytesToHexString,
  hexStringToBytes,
  normalizeHexString,
  isPrefixedHexString,
  isHexString,
  getUnprefixedHexString,
  getPrefixedHexString,
  unpadHexString,
  setLengthLeft,
  hexStringToNumber,
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

  describe("hexStringToBigInt", () => {
    it("Should convert a hexadecimal string to a bigint", () => {
      assert.equal(hexStringToBigInt("0x"), 0n);
      assert.equal(hexStringToBigInt("0x0"), 0n);
      assert.equal(hexStringToBigInt("0x1"), 1n);
      assert.equal(hexStringToBigInt("0xf"), 15n);
      assert.equal(hexStringToBigInt("0x10"), 16n);
      assert.equal(hexStringToBigInt("0xff"), 255n);
      assert.equal(hexStringToBigInt("0x100"), 256n);
      assert.equal(hexStringToBigInt("0xffff"), 65535n);
      assert.equal(hexStringToBigInt("0x10000"), 65536n);
      assert.equal(hexStringToBigInt("0xffffffff"), 4294967295n);
      assert.equal(hexStringToBigInt("0x100000000"), 4294967296n);

      assert.equal(hexStringToBigInt(""), 0n);
      assert.equal(hexStringToBigInt("0"), 0n);
      assert.equal(hexStringToBigInt("1"), 1n);
      assert.equal(hexStringToBigInt("f"), 15n);
      assert.equal(hexStringToBigInt("10"), 16n);
      assert.equal(hexStringToBigInt("ff"), 255n);
      assert.equal(hexStringToBigInt("100"), 256n);
      assert.equal(hexStringToBigInt("ffff"), 65535n);
      assert.equal(hexStringToBigInt("10000"), 65536n);
      assert.equal(hexStringToBigInt("ffffffff"), 4294967295n);
      assert.equal(hexStringToBigInt("100000000"), 4294967296n);
    });

    it("Should throw InvalidParameterError if the input is not a hexadecimal string", () => {
      assert.throws(() => hexStringToBigInt("invalid"), {
        name: "InvalidParameterError",
        message: "Expected a valid hexadecimal string. Received: invalid",
      });
    });
  });

  describe("hexStringToNumber", () => {
    it("Should convert a hexadecimal string to a number", () => {
      assert.equal(hexStringToNumber("0x"), 0);
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

      assert.equal(hexStringToNumber(""), 0);
      assert.equal(hexStringToNumber("0"), 0);
      assert.equal(hexStringToNumber("1"), 1);
      assert.equal(hexStringToNumber("f"), 15);
      assert.equal(hexStringToNumber("10"), 16);
      assert.equal(hexStringToNumber("ff"), 255);
      assert.equal(hexStringToNumber("100"), 256);
      assert.equal(hexStringToNumber("ffff"), 65535);
      assert.equal(hexStringToNumber("10000"), 65536);
      assert.equal(hexStringToNumber("ffffffff"), 4294967295);
      assert.equal(hexStringToNumber("100000000"), 4294967296);
      assert.equal(hexStringToNumber("ffffffff"), 4294967295);

      // Max allowed value
      assert.equal(hexStringToNumber("0x1fffffffffffff"), 9007199254740991);
    });

    it("Should throw InvalidParameterError if the input exceeds the safe integer limit", () => {
      assert.throws(() => hexStringToNumber("0x20000000000000"), {
        name: "InvalidParameterError",
        message:
          "Value exceeds the safe integer limit. Received: 0x20000000000000",
      });
    });

    it("Should throw InvalidParameterError if the input is not a hexadecimal string", () => {
      assert.throws(() => hexStringToNumber("invalid"), {
        name: "InvalidParameterError",
        message: "Expected a valid hexadecimal string. Received: invalid",
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
      assert.deepEqual(hexStringToBytes("0x"), new Uint8Array([0]));
      assert.deepEqual(hexStringToBytes("0x0"), new Uint8Array([0]));
      assert.deepEqual(hexStringToBytes("0x1"), new Uint8Array([1]));
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

      assert.deepEqual(hexStringToBytes(""), new Uint8Array([0]));
      assert.deepEqual(hexStringToBytes("0"), new Uint8Array([0]));
      assert.deepEqual(hexStringToBytes("1"), new Uint8Array([1]));
      assert.deepEqual(hexStringToBytes("0f"), new Uint8Array([15]));
      assert.deepEqual(hexStringToBytes("10"), new Uint8Array([16]));
      assert.deepEqual(hexStringToBytes("ff"), new Uint8Array([255]));
      assert.deepEqual(
        hexStringToBytes("010203"),
        new Uint8Array([0x01, 0x02, 0x03]),
      );
      assert.deepEqual(
        hexStringToBytes("00010f10ff"),
        new Uint8Array([0, 1, 15, 16, 255]),
      );
    });

    it("Should throw InvalidParameterError if the input is not a hexadecimal string", () => {
      assert.throws(() => hexStringToBytes("invalid"), {
        name: "InvalidParameterError",
        message: "Expected a valid hexadecimal string. Received: invalid",
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

    it("Should throw InvalidParameterError if the input is not a hexadecimal string", () => {
      assert.throws(() => hexStringToBytes("invalid"), {
        name: "InvalidParameterError",
        message: "Expected a valid hexadecimal string. Received: invalid",
      });
    });
  });

  describe("isPrefixedHexString", () => {
    it("Should check if a string is prefixed with '0x'", () => {
      assert.equal(isPrefixedHexString("0x0"), true);
      assert.equal(isPrefixedHexString("ffff"), false);
      assert.equal(isPrefixedHexString("0X100000000"), true);
      assert.equal(isPrefixedHexString("20000000000000"), false);
    });
  });

  describe("isHexString", () => {
    it("Should check if a string is a hexadecimal string", () => {
      assert.equal(isHexString("0x0"), true);
      assert.equal(isHexString("0xFFff"), true);
      assert.equal(isHexString(" 0x10000 "), false);
      assert.equal(isHexString("0X1000000Ff      "), false);
      assert.equal(isHexString("20000000000000"), true);
      assert.equal(isHexString("invalid"), false); // i, n, v, l are not hexadecimal characters
      assert.equal(isHexString(10), false);
      assert.equal(isHexString(true), false);
      assert.equal(isHexString({}), false);
      assert.equal(isHexString(""), true);
      assert.equal(isHexString("0x"), true);
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

  describe("getPrefixedHexString", () => {
    it("Should remove the '0x' prefix from a hexadecimal string", () => {
      assert.equal(getPrefixedHexString("0x0"), "0x0");
      assert.equal(getPrefixedHexString("0xFFff"), "0xFFff");
      assert.equal(getPrefixedHexString("0X1000000Ff"), "0X1000000Ff");
      assert.equal(getPrefixedHexString("20000000000000"), "0x20000000000000");
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

  describe("setLengthLeft", () => {
    it("Should set the length of a hexadecimal string", () => {
      assert.equal(setLengthLeft("0x0", 1), "0x0"); // Same length
      assert.equal(setLengthLeft("0x0", 2), "0x00");
      assert.equal(setLengthLeft("0x1", 2), "0x01");
      assert.equal(setLengthLeft("0x1", 4), "0x0001");
      assert.equal(setLengthLeft("0x1", 8), "0x00000001");
      assert.equal(setLengthLeft("0x1", 16), "0x0000000000000001");
    });

    it("Should truncate the string if it's too long", () => {
      assert.equal(setLengthLeft("0x0000000000000001", 1), "0x1");
      assert.equal(setLengthLeft("0x0000000000000001", 2), "0x01");
      assert.equal(setLengthLeft("0x0000000000000001", 4), "0x0001");
      assert.equal(setLengthLeft("0x0000000000000001", 8), "0x00000001");
      assert.equal(
        setLengthLeft("0x0000000000000001", 16),
        "0x0000000000000001",
      );
    });
  });
});
