import type { Keccak256 } from "../../../src/internal/edr/keccak.js";

import assert from "node:assert/strict";
import { describe, it, before } from "node:test";

import { keccak256 as jsKeccak256 } from "@nomicfoundation/hardhat-utils/crypto";
import { bytesToHexString } from "@nomicfoundation/hardhat-utils/hex";

import { getNativeKeccak256 } from "../../../src/internal/edr/keccak.js";

describe("getNativeKeccak256", () => {
  let keccak256: Keccak256;

  before(async () => {
    const nativeKeccak256 = await getNativeKeccak256();

    assert.ok(
      nativeKeccak256 !== undefined,
      "EDR's native keccak256 should be available on the platforms that run this suite",
    );

    keccak256 = nativeKeccak256;
  });

  it("should return the same instance on every call", async () => {
    assert.equal(await getNativeKeccak256(), keccak256);
  });

  it("should hash the well-known test vectors", () => {
    assert.equal(
      bytesToHexString(keccak256(new Uint8Array(0))),
      "0xc5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470",
    );

    assert.equal(
      bytesToHexString(keccak256(new TextEncoder().encode("abc"))),
      "0x4e03657aea45a94fc7d47ba826c8d667c0d1e6e33a64a036ec44f58fa12d6c45",
    );
  });

  it("should match the JS implementation", async () => {
    const lengths = [...Array.from({ length: 4_097 }, (_, i) => i), 1_500_000];

    for (const length of lengths) {
      const input = new Uint8Array(length);
      // Deterministic LCG, seeded by the length, so that both the length and
      // the content vary across iterations.
      let state = length + 1;
      for (let i = 0; i < length; i++) {
        state = (state * 1_664_525 + 1_013_904_223) % 4_294_967_296;
        input[i] = state % 256;
      }

      assert.equal(
        bytesToHexString(keccak256(input)),
        bytesToHexString(await jsKeccak256(input)),
        `keccak256 mismatch for a ${length}-byte input`,
      );
    }
  });
});
