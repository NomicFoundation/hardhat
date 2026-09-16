import assert from "node:assert/strict";
import { describe, it, before } from "node:test";

import { assertThrows } from "@nomicfoundation/hardhat-test-utils";
import * as ethers from "ethers";
import { secp256k1PublicKeyFromSecretKey as nativePublicKeyFromSecretKey } from "hardhat/internal/native-crypto";

import {
  getNativeSecp256k1CallCount,
  installNativeSecp256k1,
} from "../src/internal/native-secp256k1.js";

const SECRET_KEY =
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

// The mnemonic from the BIP-39 test vectors.
const MNEMONIC =
  "legal winner thank year wave sausage worth useful legal winner thank yellow";

// These tests check that EDR's derivation is wired into ethers and that the
// replacement preserves ethers' observable behavior. EDR's derivation itself is
// assumed correct: it's tested in EDR.
describe("installing EDR's secp256k1 derivation into ethers", () => {
  before(() => {
    installNativeSecp256k1();
  });

  it("should route ethers' public key derivation through EDR", () => {
    const callCountBefore = getNativeSecp256k1CallCount();

    new ethers.Wallet(SECRET_KEY);

    assert.ok(
      getNativeSecp256k1CallCount() > callCountBefore,
      "ethers should route public key derivation through the native implementation",
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
      assertThrows(
        () => ethers.SigningKey.computePublicKey(secretKey),
        undefined,
        `${secretKey} should be rejected`,
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
