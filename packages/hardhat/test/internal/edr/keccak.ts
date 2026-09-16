import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { bytesToHexString } from "@nomicfoundation/hardhat-utils/hex";

import { keccak256 } from "../../../src/internal/edr/exports.js";

// EDR's keccak256 is assumed correct, as it's tested in EDR. This only checks
// that the re-export is wired to it.
describe("EDR's keccak256 export", () => {
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
});
