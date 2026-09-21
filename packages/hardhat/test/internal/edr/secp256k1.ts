import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  bytesToHexString,
  hexStringToBytes,
} from "@nomicfoundation/hardhat-utils/hex";

import { secp256k1PublicKeyFromSecretKey } from "../../../src/internal/edr/exports.js";

// EDR's derivation is assumed correct, as it's tested in EDR. This only checks
// that the re-export is wired to it.
describe("EDR's secp256k1 public key derivation export", () => {
  it("should derive the well-known public key of a known secret key", () => {
    const publicKey = secp256k1PublicKeyFromSecretKey(
      hexStringToBytes(
        "ac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
      ),
    );

    assert.equal(
      bytesToHexString(publicKey),
      "0x048318535b54105d4a7aae60c08fc45f9687181b4fdfc625bd1a753fa7397fed75" +
        "3547f11ca8696646f2f3acb08e31016afac23e630c5d11f59f61fef57b0d2aa5",
    );
  });
});
