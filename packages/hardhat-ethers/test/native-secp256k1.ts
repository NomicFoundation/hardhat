import type { Secp256k1PublicKeyFromSecretKey } from "hardhat/internal/edr";

import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { describe, it, before } from "node:test";

import { assertThrows } from "@nomicfoundation/hardhat-test-utils";
import * as ethers from "ethers";
import { getNativeSecp256k1PublicKeyFromSecretKey } from "hardhat/internal/edr";

import {
  getNativeSecp256k1CallCount,
  installNativeSecp256k1,
} from "../src/internal/native-secp256k1.js";

const SECRET_KEY =
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
const ADDRESS = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";

// The mnemonic from the BIP-39 test vectors.
const MNEMONIC =
  "legal winner thank year wave sausage worth useful legal winner thank yellow";

describe("native secp256k1 installation", () => {
  let nativePublicKeyFromSecretKey: Secp256k1PublicKeyFromSecretKey;

  before(async () => {
    const maybeNative = await getNativeSecp256k1PublicKeyFromSecretKey();
    assert.ok(
      maybeNative !== undefined,
      "EDR's native secp256k1 derivation should be available on the platforms that run this suite",
    );
    nativePublicKeyFromSecretKey = maybeNative;

    await installNativeSecp256k1();
  });

  it("should derive public keys through the native implementation", () => {
    const callCountBefore = getNativeSecp256k1CallCount();

    new ethers.Wallet(SECRET_KEY);

    assert.ok(
      getNativeSecp256k1CallCount() > callCountBefore,
      "ethers should route public key derivation through the native implementation",
    );
  });

  it("should agree with EDR on both encodings", () => {
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

  it("should derive the well-known address of a known secret key", () => {
    assert.equal(ethers.computeAddress(SECRET_KEY), ADDRESS);
    assert.equal(new ethers.Wallet(SECRET_KEY).address, ADDRESS);
  });

  it("should derive the same values as ethers for random secret keys", () => {
    for (let i = 0; i < 256; i++) {
      const secretKey = randomBytes(32);

      let signingKey;
      try {
        signingKey = new ethers.SigningKey(secretKey);
      } catch {
        continue; // outside [1, n), which the loop below covers explicitly
      }

      const publicKey = nativePublicKeyFromSecretKey(secretKey);

      assert.equal(signingKey.publicKey, ethers.hexlify(publicKey));
      assert.equal(
        ethers.computeAddress(signingKey.publicKey),
        ethers.computeAddress(ethers.hexlify(secretKey)),
      );
    }
  });

  it("should keep rejecting secret keys outside the curve order", () => {
    // The curve order itself, and the values right around the ends of the
    // valid range.
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

    // The ends of the valid range, which must keep working.
    ethers.SigningKey.computePublicKey(`0x${"00".repeat(31)}01`);
    ethers.SigningKey.computePublicKey(
      "0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364140",
    );
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

  it("should keep the operations built on top of the replaced method working", () => {
    const signingKey = new ethers.SigningKey(SECRET_KEY);
    const other = new ethers.SigningKey(`0x${"11".repeat(32)}`);

    assert.equal(
      ethers.SigningKey.addPoints(signingKey.publicKey, other.publicKey, true)
        .length,
      68,
    );

    assert.equal(
      signingKey.computeSharedSecret(other.publicKey),
      other.computeSharedSecret(signingKey.publicKey),
    );

    const digest = ethers.id("a message to sign");
    assert.equal(
      ethers.SigningKey.recoverPublicKey(digest, signingKey.sign(digest)),
      signingKey.publicKey,
    );
  });

  it("should derive HD wallets identically", () => {
    const wallet = ethers.HDNodeWallet.fromPhrase(MNEMONIC);

    // The address of m/44'/60'/0'/0/0 for this mnemonic.
    assert.equal(wallet.address, "0x58A57ed9d8d624cBD12e2C467D34787555bB1b25");

    for (let index = 0; index < 4; index++) {
      const derived = ethers.HDNodeWallet.fromPhrase(
        MNEMONIC,
        "",
        `m/44'/60'/0'/0/${index}`,
      );

      assert.equal(
        derived.address,
        new ethers.Wallet(derived.privateKey).address,
        `account ${index} should derive the same address from its secret key`,
      );
    }
  });

  it("should not install again on later calls", async () => {
    const computePublicKey = ethers.SigningKey.computePublicKey;

    await installNativeSecp256k1();

    assert.equal(
      ethers.SigningKey.computePublicKey,
      computePublicKey,
      "a repeated call shouldn't replace the method again",
    );
  });
});
