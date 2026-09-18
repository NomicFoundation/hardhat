import type { BytesLike } from "ethers";

import { createDebug } from "@nomicfoundation/hardhat-utils/debug";
import { computeAddress, getBytes, hexlify, SigningKey } from "ethers";
import { secp256k1PublicKeyFromSecretKey as nativePublicKeyFromSecretKey } from "hardhat/internal/native-crypto";

const log = createDebug("hardhat:ethers:native-secp256k1");

/**
 * A known secret key and the values ethers must derive from it, used to
 * validate the replacement before keeping it.
 * Needed because the secp256k1 derivation is overridden directly rather than
 * registered through ethers' hooks, as is possible for hash functions like
 * keccak256.
 */
const SELF_CHECK_SECRET_KEY =
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
const SELF_CHECK_ADDRESS = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
const SELF_CHECK_COMPRESSED_PUBLIC_KEY =
  "0x038318535b54105d4a7aae60c08fc45f9687181b4fdfc625bd1a753fa7397fed75";

const SECRET_KEY_LENGTH = 32;
const UNCOMPRESSED_PUBLIC_KEY_LENGTH = 65;

let installed = false;
// How many times the native derivation has been used. The self-check compares
// it before and after asking ethers to derive a key, because a version of ethers
// that stopped calling the replaced method would still return correct values.
let nativeCallCount = 0;

/**
 * Replaces ethers' pure-JS secp256k1 public key derivation with EDR's native
 * one, which is several times faster. All of ethers' derivations go through
 * `SigningKey.computePublicKey`, so overwriting that static method covers
 * wallets, HD derivation and `computeAddress`.
 *
 * ethers has no hook for this, and the method isn't public API, so the
 * replacement is validated against a known secret key: the results must be
 * correct and ethers must actually have called it. Otherwise, or if installing
 * fails, ethers' own implementation stays, and this only logs under DEBUG.
 *
 * Only the ethers instance this plugin resolves is affected. Installs once, on
 * the first call.
 */
export function installNativeSecp256k1(): void {
  if (installed) {
    return;
  }

  installed = true;

  try {
    const jsComputePublicKey = SigningKey.computePublicKey;

    SigningKey.computePublicKey = function (
      key: BytesLike,
      compressed?: boolean,
    ): string {
      const bytes = getBytes(key, "key");

      if (bytes.length !== SECRET_KEY_LENGTH) {
        return jsComputePublicKey(bytes, compressed);
      }

      let publicKey;
      try {
        publicKey = nativePublicKeyFromSecretKey(bytes);
      } catch (error) {
        log("EDR's native secp256k1 derivation failed: %O", error);

        return jsComputePublicKey(bytes, compressed);
      }

      nativeCallCount++;

      if (compressed === undefined || !compressed) {
        return hexlify(publicKey);
      }

      return hexlify(compressPublicKey(publicKey));
    };

    if (!selfCheckPasses()) {
      SigningKey.computePublicKey = jsComputePublicKey;
      return;
    }

    log("Installed EDR's native secp256k1 derivation into ethers");
  } catch (error) {
    // Assigning to the method throws if ethers has frozen `SigningKey`.
    // Swallowed so that such an ethers doesn't break network connections.
    log("Failed to install EDR's native secp256k1 derivation: %O", error);
  }
}

/**
 * Turns an uncompressed public key (`0x04 || X || Y`) into its compressed
 * encoding: X, prefixed by the parity of Y.
 */
function compressPublicKey(publicKey: Uint8Array): Uint8Array {
  const compressed = new Uint8Array(33);

  /* eslint-disable-next-line no-bitwise -- the SEC1 prefix encodes the parity
  of the last byte of Y */
  compressed[0] = 0x02 | (publicKey[UNCOMPRESSED_PUBLIC_KEY_LENGTH - 1] & 1);
  compressed.set(publicKey.subarray(1, 33), 1);

  return compressed;
}

/**
 * Asks ethers to derive a known secret key and returns whether the results are
 * correct and were produced by the native implementation. A future version of
 * ethers that stops calling `SigningKey.computePublicKey` internally would
 * still return the right values, so correctness alone isn't enough.
 */
function selfCheckPasses(): boolean {
  const callCountBefore = nativeCallCount;

  let address;
  let compressedPublicKey;

  try {
    address = computeAddress(SELF_CHECK_SECRET_KEY);
    compressedPublicKey = new SigningKey(SELF_CHECK_SECRET_KEY)
      .compressedPublicKey;
  } catch (error) {
    log("Self-check of the native secp256k1 derivation threw: %O", error);

    return false;
  }

  if (
    address !== SELF_CHECK_ADDRESS ||
    compressedPublicKey !== SELF_CHECK_COMPRESSED_PUBLIC_KEY
  ) {
    log(
      "The native secp256k1 derivation returned unexpected values; restoring ethers' JS one",
    );

    return false;
  }

  if (nativeCallCount - callCountBefore < 2) {
    log(
      "This version of ethers doesn't derive public keys through SigningKey.computePublicKey; restoring its JS one",
    );

    return false;
  }

  return true;
}
