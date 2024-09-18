import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { expectTypeOf } from "expect-type";

import {
  isAddress,
  isHash,
  toEvmWord,
  generateHashBytes,
  randomHash,
  generateAddressBytes,
  randomAddress,
  isValidChecksumAddress,
} from "../src/eth.js";

describe("eth", () => {
  describe("isAddress", () => {
    it("Should return true for valid addresses", () => {
      assert.ok(
        isAddress("0x1234567890123456789012345678901234567890"),
        "An address with 40 numeric characters should be valid",
      );
      assert.ok(
        isAddress("0xabcdefABCDEFabcdefABCDEFabcdefABCDEFabcd"),
        "An address with 40 mixed-case characters should be valid",
      );
      assert.ok(
        isAddress("0x1234abcd5678ABCD9012efab3456CDEF7890abcd"),
        "An address with 40 mixed-case alphanumeric characters should be valid",
      );
    });

    it("Should return false for invalid addresses", () => {
      assert.ok(!isAddress("0x"), "The 0x address is not valid"); // zero address
      assert.ok(!isAddress("0x0"), "The 0x0 address is not valid"); // zero address
      assert.ok(!isAddress(""), "An empty address is not valid"); // empty
      assert.ok(!isAddress("0x00"), "The 0x00 address is not valid"); // zero address with extra 0
      assert.ok(
        !isAddress("0x123456789012345678901234567890123456789"),
        "An address with less than 40 characters is not valid",
      ); // too short
      assert.ok(
        !isAddress("0x12345678901234567890123456789012345678901"),
        "An address with more than 40 characters is not valid",
      ); // too long
      assert.ok(
        !isAddress("0x12345678901234567890*234567890123456789g"),
        "An address with invalid characters is not valid",
      ); // invalid character
      assert.ok(
        !isAddress("1234567890123456789012345678901234567890"),
        "An address without the 0x prefix is not valid",
      ); // missing prefix
    });
  });

  describe("isValidChecksumAddress", () => {
    it("Should return true for valid checksum addresses", async () => {
      const eip55ChecksumAddresses = [
        // All caps
        "0x52908400098527886E0F7030069857D2E4169EE7",
        "0x8617E340B3D01FA5F11F306F4090FD50E238070D",
        // All Lower
        "0xde709f2102306220921060314715629080e2fb77",
        "0x27b1fdb04752bbc536007a920d24acb045561c26",
        // Normal
        "0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed",
        "0xfB6916095ca1df60bB79Ce92cE3Ea74c37c5d359",
        "0xdbF03B407c01E7cD3CBea99509d93f8DDDC8C6FB",
        "0xD1220A0cf47c7B9Be7A2E6BA89F429762e7b9aDb",
      ];

      for (const address of eip55ChecksumAddresses) {
        assert.equal(await isValidChecksumAddress(address), true);
      }
    });

    it("Should return false for an invalid checksum addresses", async () => {
      assert.equal(
        await isValidChecksumAddress(
          "0x2f015c60e0be116b1f0cd534704db9c92118fb6a",
        ),
        false,
      );
    });

    it("Should return false for an addresses not starting in 0x", async () => {
      assert.equal(
        await isValidChecksumAddress(
          "2f015c60e0be116b1f0cd534704db9c92118fb6a",
        ),
        false,
      );
    });

    it("Should return false for an invalid addresses (non hex string)", async () => {
      assert.equal(
        await isValidChecksumAddress(
          "0xZZ015c60e0be116b1f0cd534704db9c92118fb6a",
        ),
        false,
      );
    });
  });

  describe("isHash", () => {
    it("Should return true for valid hashes", () => {
      assert.ok(
        isHash(
          "0x1234567890123456789012345678901234567890123456789012345678901234",
        ),
        "A hash with 64 numeric characters should be valid",
      );
      assert.ok(
        isHash(
          "0xabcdefABCDEFabcdefABCDEFabcdefABCDEFabcdefABCDEFabcdefABCDEFabcd",
        ),
        "A hash with 64 mixed-case characters should be valid",
      );
      assert.ok(
        isHash(
          "0x1234abcd5678ABCD9012efab3456CDEF7890abcd1234abcd5678ABCD9012efab",
        ),
        "A hash with 64 mixed-case alphanumeric characters should be valid",
      );
    });

    it("Should return false for invalid hashes", () => {
      assert.ok(!isHash("0x"), "The 0x hash is not valid"); // zero hash
      assert.ok(!isHash("0x0"), "The 0x0 hash is not valid"); // zero hash
      assert.ok(!isHash(""), "An empty hash is not valid"); // empty
      assert.ok(!isHash("0x00"), "The 0x00 hash is not valid"); // zero hash with extra 0
      assert.ok(
        !isHash(
          "0x123456789012345678901234567890123456789012345678901234567890123",
        ),
        "A hash with less than 64 characters is not valid",
      ); // too short
      assert.ok(
        !isHash(
          "0x12345678901234567890123456789012345678901234567890123456789012345",
        ),
        "A hash with more than 64 characters is not valid",
      ); // too long
      assert.ok(
        !isHash(
          "0x12345678901234567890*2345678901234567890123456789012345678901234",
        ),
        "A hash with invalid characters is not valid",
      ); // invalid character
      assert.ok(
        !isHash(
          "1234567890123456789012345678901234567890123456789012345678901234",
        ),
        "A hash without the 0x prefix is not valid",
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
      assert.ok(isHash(hash), "Should be a valid hash");
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
      assert.ok(isAddress(address), "Should be a valid address");
      assert.equal(address.length, 42); // account for the "0x" prefix
    });
  });
});
