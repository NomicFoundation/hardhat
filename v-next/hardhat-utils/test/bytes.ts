import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  isBytes,
  setLengthLeft,
  equalsBytes,
  utf8StringToBytes,
  bytesToUtf8String,
  bytesIncludesUtf8String,
} from "../src/bytes.js";

describe("bytes", () => {
  describe("isBytes", () => {
    it("Should return true for Uint8Array", () => {
      assert.ok(isBytes(new Uint8Array()), "Should return true for Uint8Array");
    });

    it("Should return true for Buffer", () => {
      assert.ok(isBytes(Buffer.alloc(0)), "Should return true for Buffer");
    });

    it("Should return false for other types", () => {
      assert.ok(!isBytes(""), "Should return false for string");
      assert.ok(!isBytes(0), "Should return false for number");
      assert.ok(!isBytes(null), "Should return false for null");
      assert.ok(!isBytes(undefined), "Should return false for undefined");
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
      assert.ok(
        equalsBytes(bytes1, bytes2),
        `${bytes1.toString()} should equal ${bytes2.toString()}`,
      );
    });

    it("Should return false for different Uint8Arrays", () => {
      const bytes1 = new Uint8Array([0x01, 0x02, 0x03]);
      const bytes2 = new Uint8Array([0x01, 0x02, 0x04]);
      assert.ok(
        !equalsBytes(bytes1, bytes2),
        `${bytes1.toString()} should not equal ${bytes2.toString()}`,
      );
    });

    it("Should return true for equal Uint8Array and Buffer", () => {
      const bytes = new Uint8Array([0x01, 0x02, 0x03]);
      const buffer = Buffer.from([0x01, 0x02, 0x03]);
      assert.ok(
        equalsBytes(bytes, buffer),
        `${bytes.toString()} should equal ${buffer.toString()}`,
      );
    });

    it("Should return false for different Uint8Array and Buffer", () => {
      const bytes1 = new Uint8Array([0x01, 0x02, 0x03]);
      const buffer = Buffer.from([0x01, 0x02, 0x04]);
      assert.ok(
        !equalsBytes(bytes1, buffer),
        `${bytes1.toString()} should not equal ${buffer.toString()}`,
      );
    });
  });

  describe("utf8StringToBytes", () => {
    it("should convert a simple string to a byte array", () => {
      const input = "hello";
      const expected = new Uint8Array([104, 101, 108, 108, 111]);
      const result = utf8StringToBytes(input);
      assert.deepEqual(result, expected);
    });

    it("should convert a string with special characters to a byte array", () => {
      const input = "こんにちは";
      const expected = new Uint8Array([
        227, 129, 147, 227, 130, 147, 227, 129, 171, 227, 129, 161, 227, 129,
        175,
      ]);
      const result = utf8StringToBytes(input);
      assert.deepEqual(result, expected);
    });

    it("should convert a hex-like string to its byte array representation", () => {
      const input = "68656c6c6f";
      const expected = new Uint8Array([
        54, 56, 54, 53, 54, 99, 54, 99, 54, 102,
      ]);
      const result = utf8StringToBytes(input);
      assert.deepEqual(result, expected);
    });

    it("should return an empty byte array for an empty string", () => {
      const input = "";
      const expected = new Uint8Array([]);
      const result = utf8StringToBytes(input);
      assert.deepEqual(result, expected);
    });
  });

  describe("bytesToUtf8String", () => {
    it("should convert a byte array back to a simple string", () => {
      const bytes = new Uint8Array([104, 101, 108, 108, 111]);
      assert.equal(bytesToUtf8String(bytes), "hello");
    });

    it("should round-trip with utf8StringToBytes", () => {
      const input = "world";
      assert.equal(bytesToUtf8String(utf8StringToBytes(input)), input);
    });

    it("should handle multi-byte characters", () => {
      const input = "こんにちは";
      assert.equal(bytesToUtf8String(utf8StringToBytes(input)), input);
    });

    it("should return an empty string for an empty byte array", () => {
      assert.equal(bytesToUtf8String(new Uint8Array([])), "");
    });
  });

  describe("bytesIncludesUtf8String", () => {
    it("should return true when the needle is at the start", () => {
      const haystack = utf8StringToBytes("hello world foo bar");
      assert.ok(
        bytesIncludesUtf8String(haystack, "hello"),
        "should find needle at the start",
      );
    });

    it("should return true when the needle is in the middle", () => {
      const haystack = utf8StringToBytes("foo hello bar");
      assert.ok(
        bytesIncludesUtf8String(haystack, "hello"),
        "should find needle in the middle",
      );
    });

    it("should return true when the needle is at the end", () => {
      const haystack = utf8StringToBytes("foo bar hello");
      assert.ok(
        bytesIncludesUtf8String(haystack, "hello"),
        "should find needle at the end",
      );
    });

    it("should return false when the needle is not present", () => {
      const haystack = utf8StringToBytes("foo bar baz");
      assert.ok(
        !bytesIncludesUtf8String(haystack, "hello"),
        "should not find a missing needle",
      );
    });

    it("should return false when the needle is longer than the haystack", () => {
      const haystack = utf8StringToBytes("hello");
      assert.ok(
        !bytesIncludesUtf8String(haystack, "hello world"),
        "needle longer than haystack should not match",
      );
    });

    it("should return true for an empty needle", () => {
      const haystack = utf8StringToBytes("some content");
      assert.ok(
        bytesIncludesUtf8String(haystack, ""),
        "empty needle should always match",
      );
    });

    it("should handle partial matches without false positives", () => {
      const haystack = utf8StringToBytes("helloworld");
      assert.ok(
        bytesIncludesUtf8String(haystack, "helloworld"),
        "should find exact match",
      );
      assert.ok(
        !bytesIncludesUtf8String(haystack, "hello world"),
        "should not match with extra space",
      );
    });

    it("should handle multi-byte needle characters", () => {
      const haystack = utf8StringToBytes("prefix こんにちは suffix");
      assert.ok(
        bytesIncludesUtf8String(haystack, "こんにちは"),
        "should find the multi-byte needle",
      );
      assert.ok(
        !bytesIncludesUtf8String(haystack, "さようなら"),
        "should not find a missing multi-byte needle",
      );
    });
  });
});
