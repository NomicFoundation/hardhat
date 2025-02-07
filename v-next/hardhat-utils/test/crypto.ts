import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { keccak256, createNonCryptographicHashId } from "../src/crypto.js";
import { bytesToHexString } from "../src/hex.js";

describe("crypto", () => {
  describe("keccak256", () => {
    it("Should hash the input bytes", async () => {
      const hash = await keccak256(Uint8Array.from([1, 2, 3]));
      assert.equal(
        bytesToHexString(hash),
        "0xf1885eda54b7a053318cd41e2093220dab15d65381b1157a3633a83bfd5c9239",
      );
    });
  });

  describe("createNonCryptographicHashId", () => {
    it("Should create a non-cryptographic hash-based identifier", async () => {
      assert.equal(
        await createNonCryptographicHashId("hello"),
        "aaf4c61ddcc5e8a2dabede0f3b482cd9aea9434d",
      );
    });
  });
});
