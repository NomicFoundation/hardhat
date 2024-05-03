import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { expectTypeOf } from "expect-type";

import {
  isAddress,
  isHash,
  toEvmWord,
  generateHashBytes,
  randomHash,
  generateAddressBytes,
  randomAddress,
} from "../src/eth.js";

describe("eth", () => {
  describe("isAddress", () => {
    it("Should return true for valid addresses", () => {
      assert.ok(isAddress("0x1234567890123456789012345678901234567890"));
      assert.ok(isAddress("0xabcdefABCDEFabcdefABCDEFabcdefABCDEFabcd"));
      assert.ok(isAddress("0x1234abcd5678ABCD9012efab3456CDEF7890abcd"));
    });

    it("Should return false for invalid addresses", () => {
      assert.ok(!isAddress("0x")); // zero address
      assert.ok(!isAddress("0x0")); // zero address
      assert.ok(!isAddress("")); // empty
      assert.ok(!isAddress("0x00")); // zero address with extra 0
      assert.ok(!isAddress("0x123456789012345678901234567890123456789")); // too short
      assert.ok(!isAddress("0x12345678901234567890123456789012345678901")); // too long
      assert.ok(!isAddress("0x12345678901234567890*234567890123456789g")); // invalid character
      assert.ok(!isAddress("1234567890123456789012345678901234567890")); // missing prefix
    });
  });

  describe("isHash", () => {
    it("Should return true for valid hashes", () => {
      assert.ok(
        isHash(
          "0x1234567890123456789012345678901234567890123456789012345678901234",
        ),
      );
      assert.ok(
        isHash(
          "0xabcdefABCDEFabcdefABCDEFabcdefABCDEFabcdefABCDEFabcdefABCDEFabcd",
        ),
      );
      assert.ok(
        isHash(
          "0x1234abcd5678ABCD9012efab3456CDEF7890abcd1234abcd5678ABCD9012efab",
        ),
      );
    });

    it("Should return false for invalid hashes", () => {
      assert.ok(!isHash("0x")); // zero hash
      assert.ok(!isHash("0x0")); // zero hash
      assert.ok(!isHash("")); // empty
      assert.ok(!isHash("0x00")); // zero hash with extra 0
      assert.ok(
        !isHash(
          "0x123456789012345678901234567890123456789012345678901234567890123",
        ),
      ); // too short
      assert.ok(
        !isHash(
          "0x12345678901234567890123456789012345678901234567890123456789012345",
        ),
      ); // too long
      assert.ok(
        !isHash(
          "0x12345678901234567890*2345678901234567890123456789012345678901234",
        ),
      ); // invalid character
      assert.ok(
        !isHash(
          "1234567890123456789012345678901234567890123456789012345678901234",
        ),
      ); // missing prefix
    });
  });

  describe("toEvmWord", () => {
    it("Should convert numbers to 32-byte hexadecimal strings", () => {
      assert.equal(
        toEvmWord(0),
        "0x0000000000000000000000000000000000000000000000000000000000000000",
      );
      assert.equal(
        toEvmWord(1),
        "0x0000000000000000000000000000000000000000000000000000000000000001",
      );
      assert.equal(
        toEvmWord(Number.MAX_SAFE_INTEGER),
        "0x000000000000000000000000000000000000000000000000001fffffffffffff",
      );
    });

    it("Should convert bigints to 32-byte hexadecimal strings", () => {
      assert.equal(
        toEvmWord(0n),
        "0x0000000000000000000000000000000000000000000000000000000000000000",
      );
      assert.equal(
        toEvmWord(1n),
        "0x0000000000000000000000000000000000000000000000000000000000000001",
      );
      assert.equal(
        toEvmWord(BigInt(Number.MAX_SAFE_INTEGER)),
        "0x000000000000000000000000000000000000000000000000001fffffffffffff",
      );
      assert.equal(
        toEvmWord(BigInt(Number.MAX_SAFE_INTEGER) + 1n),
        "0x0000000000000000000000000000000000000000000000000020000000000000",
      );
    });

    it("Should throw InvalidParameterError if the input is not a safe integer or is negative", () => {
      assert.throws(() => toEvmWord(-1), {
        name: "InvalidParameterError",
        message: "Expected a non-negative safe integer or bigint. Received: -1",
      });

      assert.throws(() => toEvmWord(-1n), {
        name: "InvalidParameterError",
        message: "Expected a non-negative safe integer or bigint. Received: -1",
      });

      const unsafeInt = Number.MAX_SAFE_INTEGER + 1;
      assert.throws(() => toEvmWord(unsafeInt), {
        name: "InvalidParameterError",
        message: `Expected a non-negative safe integer or bigint. Received: ${unsafeInt}`,
      });
    });
  });

  describe("generateHashBytes", () => {
    it("Should return a Uint8Array of 32 bytes", async () => {
      const hashBytes = await generateHashBytes();
      expectTypeOf(hashBytes).toEqualTypeOf<Uint8Array>();
      assert.equal(hashBytes.length, 32);
    });
  });

  describe("randomHash", () => {
    it("Should return a 66-character hexadecimal string", async () => {
      const hash = await randomHash();
      assert.ok(isHash(hash));
      assert.equal(hash.length, 66); // account for the "0x" prefix
    });
  });

  describe("generateAddressBytes", () => {
    it("Should return a Uint8Array of 20 bytes", async () => {
      const addressBytes = await generateAddressBytes();
      expectTypeOf(addressBytes).toEqualTypeOf<Uint8Array>();
      assert.equal(addressBytes.length, 20);
    });
  });

  describe("randomAddress", () => {
    it("Should return a 42-character hexadecimal string", async () => {
      const address = await randomAddress();
      assert.ok(isAddress(address));
      assert.equal(address.length, 42); // account for the "0x" prefix
    });
  });
});
