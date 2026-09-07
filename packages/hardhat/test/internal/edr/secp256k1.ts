import type { Secp256k1PublicKeyFromSecretKey } from "../../../src/internal/edr/secp256k1.js";

import assert from "node:assert/strict";
import { describe, it, before } from "node:test";

import { assertThrows } from "@nomicfoundation/hardhat-test-utils";
import {
  bytesToHexString,
  hexStringToBytes,
} from "@nomicfoundation/hardhat-utils/hex";

import { getNativeSecp256k1PublicKeyFromSecretKey } from "../../../src/internal/edr/secp256k1.js";

// The order of the secp256k1 curve, i.e. the first scalar that is out of range.
const CURVE_ORDER = BigInt(
  "0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141",
);

function secretKeyOf(scalar: bigint): Uint8Array {
  return hexStringToBytes(scalar.toString(16).padStart(64, "0"));
}

describe("getNativeSecp256k1PublicKeyFromSecretKey", () => {
  let publicKeyFromSecretKey: Secp256k1PublicKeyFromSecretKey;

  before(async () => {
    const native = await getNativeSecp256k1PublicKeyFromSecretKey();

    assert.ok(
      native !== undefined,
      "EDR's native secp256k1 derivation should be available on the platforms that run this suite",
    );

    publicKeyFromSecretKey = native;
  });

  it("should return the same instance on every call", async () => {
    assert.equal(
      await getNativeSecp256k1PublicKeyFromSecretKey(),
      publicKeyFromSecretKey,
    );
  });

  it("should derive the well-known public key of a known secret key", () => {
    const publicKey = publicKeyFromSecretKey(
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
      const publicKey = publicKeyFromSecretKey(secretKeyOf(scalar));

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
        () => publicKeyFromSecretKey(secretKey),
        undefined,
        `0x${scalar.toString(16)} should be rejected`,
      );
    }
  });

  it("should throw for inputs that aren't 32 bytes", () => {
    for (const length of [0, 31, 33, 65]) {
      assertThrows(
        () => publicKeyFromSecretKey(new Uint8Array(length).fill(1)),
        undefined,
        `a ${length}-byte input should be rejected`,
      );
    }
  });
});
