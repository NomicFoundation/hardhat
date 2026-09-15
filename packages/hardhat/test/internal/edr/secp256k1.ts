import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { assertThrows } from "@nomicfoundation/hardhat-test-utils";
import {
  bytesToHexString,
  hexStringToBytes,
} from "@nomicfoundation/hardhat-utils/hex";

import { secp256k1PublicKeyFromSecretKey } from "../../../src/internal/edr/exports.js";

// The order of the secp256k1 curve, i.e. the first scalar that is out of range.
const CURVE_ORDER = BigInt(
  "0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141",
);

function secretKeyOf(scalar: bigint): Uint8Array {
  return hexStringToBytes(scalar.toString(16).padStart(64, "0"));
}

describe("EDR's native secp256k1 public key derivation", () => {
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

  it("should return an uncompressed point for every valid secret key", () => {
    for (const scalar of [BigInt(1), BigInt(1337), CURVE_ORDER - BigInt(1)]) {
      const publicKey = secp256k1PublicKeyFromSecretKey(secretKeyOf(scalar));

      assert.equal(publicKey.length, 65);
      assert.equal(publicKey[0], 0x04);
    }
  });

  it("should throw for secret keys outside the curve order", () => {
    for (const scalar of [
      BigInt(0),
      CURVE_ORDER,
      CURVE_ORDER + BigInt(1),
      BigInt(2) ** BigInt(256) - BigInt(1),
    ]) {
      const secretKey = secretKeyOf(scalar);

      assertThrows(
        () => secp256k1PublicKeyFromSecretKey(secretKey),
        undefined,
        `0x${scalar.toString(16)} should be rejected`,
      );
    }
  });

  it("should throw for inputs that aren't 32 bytes", () => {
    for (const length of [0, 31, 33, 65]) {
      assertThrows(
        () => secp256k1PublicKeyFromSecretKey(new Uint8Array(length).fill(1)),
        undefined,
        `a ${length}-byte input should be rejected`,
      );
    }
  });
});
