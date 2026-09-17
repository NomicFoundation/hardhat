import assert from "node:assert/strict";
import { describe, it, before } from "node:test";

import { assertThrows } from "@nomicfoundation/hardhat-test-utils";
import { ensureError } from "@nomicfoundation/hardhat-utils/error";
import * as ethers from "ethers";
import { secp256k1PublicKeyFromSecretKey as nativePublicKeyFromSecretKey } from "hardhat/internal/native-crypto";

import { installNativeSecp256k1 } from "../src/internal/native-secp256k1.js";

const SECRET_KEY =
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

// The mnemonic from the BIP-39 test vectors.
const MNEMONIC =
  "legal winner thank year wave sausage worth useful legal winner thank yellow";

// Captured before anything installs the replacement. The installation restores
// this method whenever it can't use the native derivation, so the method having
// changed is what tells a working installation from a silent fallback.
const jsComputePublicKey = ethers.SigningKey.computePublicKey;

// These tests check that EDR's derivation is wired into ethers and that the
// replacement preserves ethers' observable behavior. EDR's derivation itself is
// assumed correct: it's tested in EDR.
describe("installing EDR's secp256k1 derivation into ethers", () => {
  before(() => {
    installNativeSecp256k1();
  });

  it("should replace ethers' public key derivation with EDR's", () => {
    assert.notEqual(
      ethers.SigningKey.computePublicKey,
      jsComputePublicKey,
      "ethers' own implementation should have been replaced",
    );
  });

  it("should hand back EDR's key in the encoding ethers asked for", () => {
    const signingKey = new ethers.SigningKey(SECRET_KEY);
    const publicKey = nativePublicKeyFromSecretKey(ethers.getBytes(SECRET_KEY));

    assert.equal(signingKey.publicKey, ethers.hexlify(publicKey));

    /* eslint-disable-next-line no-bitwise -- the SEC1 prefix encodes the parity
    of the last byte of Y */
    const parityPrefix = 0x02 | (publicKey[64] & 1);
    assert.equal(
      signingKey.compressedPublicKey,
      ethers.hexlify(
        ethers.concat([
          new Uint8Array([parityPrefix]),
          publicKey.subarray(1, 33),
        ]),
      ),
    );
  });

  it("should fall back to ethers' own error for invalid secret keys", () => {
    // EDR rejects these, so the error must come from ethers, as before.
    for (const secretKey of [
      `0x${"00".repeat(32)}`,
      "0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141",
      "0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364142",
      `0x${"ff".repeat(32)}`,
    ]) {
      const expectedError = errorFromEthers(secretKey);

      assertThrows(
        () => ethers.SigningKey.computePublicKey(secretKey),
        (error) =>
          error.constructor === expectedError.constructor &&
          error.message === expectedError.message,
        `${secretKey} should be rejected with ethers' own error`,
      );
    }
  });

  it("should keep reporting non-byte-like input as an invalid argument", () => {
    assertThrows(
      () => ethers.SigningKey.computePublicKey("not a hex string"),
      (error) =>
        error instanceof TypeError &&
        "code" in error &&
        error.code === "INVALID_ARGUMENT",
      "ethers should reject it as an invalid argument",
    );
  });

  it("should leave the public key re-encoding paths to ethers", () => {
    const signingKey = new ethers.SigningKey(SECRET_KEY);
    const { publicKey, compressedPublicKey } = signingKey;

    // Compressing and expanding an existing public key, in every shape ethers
    // accepts: uncompressed, compressed, and without the 0x04 header.
    assert.equal(
      ethers.SigningKey.computePublicKey(publicKey, true),
      compressedPublicKey,
    );
    assert.equal(
      ethers.SigningKey.computePublicKey(compressedPublicKey, false),
      publicKey,
    );
    assert.equal(
      ethers.SigningKey.computePublicKey(`0x${publicKey.slice(4)}`, true),
      compressedPublicKey,
    );

    // ethers defaults these paths to the compressed encoding, unlike the
    // secret key one.
    assert.equal(
      ethers.SigningKey.computePublicKey(publicKey),
      compressedPublicKey,
    );
  });

  it("should coerce the compressed argument the way ethers does", () => {
    const { publicKey, compressedPublicKey } = new ethers.SigningKey(
      SECRET_KEY,
    );

    // ethers derives secret keys with `getPublicKey(bytes, !!compressed)`, so
    // it answers these values, which its type forbids but JS callers do pass.
    const derive = (compressed: unknown) =>
      /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions --
      passing what the type forbids is the point of this test */
      ethers.SigningKey.computePublicKey(SECRET_KEY, compressed as boolean);

    for (const compressed of [true, 1, -1, "yes", "false", {}, [], BigInt(2)]) {
      assert.equal(
        derive(compressed),
        compressedPublicKey,
        `${String(compressed)} should compress`,
      );
    }

    for (const compressed of [false, undefined, null, 0, "", NaN, BigInt(0)]) {
      assert.equal(
        derive(compressed),
        publicKey,
        `${String(compressed)} should not compress`,
      );
    }
  });

  it("should still derive the BIP-39 vector address through HD wallets", () => {
    const wallet = ethers.HDNodeWallet.fromPhrase(MNEMONIC);

    // The address of m/44'/60'/0'/0/0 for this mnemonic.
    assert.equal(wallet.address, "0x58A57ed9d8d624cBD12e2C467D34787555bB1b25");
  });

  it("should not install again on later calls", () => {
    const computePublicKey = ethers.SigningKey.computePublicKey;

    installNativeSecp256k1();

    assert.equal(
      ethers.SigningKey.computePublicKey,
      computePublicKey,
      "a repeated call shouldn't replace the method again",
    );
  });
});

/**
 * Returns the error ethers' own implementation throws for a secret key, so
 * that the installed replacement can be checked to surface exactly it.
 */
function errorFromEthers(secretKey: string): Error {
  try {
    jsComputePublicKey(secretKey);
  } catch (error) {
    ensureError(error);

    return error;
  }

  assert.fail(`ethers' own implementation should reject ${secretKey}`);
}
