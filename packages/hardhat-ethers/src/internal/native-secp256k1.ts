import type { BytesLike } from "ethers";

import { createDebug } from "@nomicfoundation/hardhat-utils/debug";
import { computeAddress, getBytes, hexlify, SigningKey } from "ethers";

const log = createDebug("hardhat:ethers:native-secp256k1");

/**
 * A known secret key and the values ethers must derive from it, used to
 * validate the replacement before keeping it.
 */
const SELF_CHECK_SECRET_KEY =
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
const SELF_CHECK_ADDRESS = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
const SELF_CHECK_COMPRESSED_PUBLIC_KEY =
  "0x038318535b54105d4a7aae60c08fc45f9687181b4fdfc625bd1a753fa7397fed75";

const SECRET_KEY_LENGTH = 32;
const UNCOMPRESSED_PUBLIC_KEY_LENGTH = 65;

let installationPromise: Promise<void> | undefined;
let nativeCallCount = 0;

/**
 * How many times the native derivation has been used. Only meant for tests
 * asserting that ethers still routes through it.
 */
export function getNativeSecp256k1CallCount(): number {
  return nativeCallCount;
}

/**
 * Replaces ethers' pure-JS secp256k1 public key derivation with EDR's native
 * one, which is several times faster. Every derivation ethers performs routes
 * through `SigningKey.computePublicKey`, so this covers `new Wallet(secretKey)`,
 * `Wallet.createRandom()`, HD wallet derivation and `computeAddress`.
 *
 * ethers has hooks to register alternative implementations of its hash
 * functions, but none for this, so the static method is overwritten instead.
 * That isn't part of ethers' public API: a future
 * version could stop routing through it, which wouldn't produce wrong results
 * but would silently undo this optimization. To detect that, the replacement is
 * validated against a known secret key before being kept, checking both that
 * the derived values are correct and that ethers actually called it. If either
 * fails, ethers' own implementation is restored.
 *
 * The replacement is per-module-instance, so this only affects the ethers
 * instance that this plugin resolves; code that resolves another one keeps
 * using the JS implementation.
 *
 * If the native implementation isn't available, this leaves ethers as it is,
 * reporting it only under DEBUG.
 */
export async function installNativeSecp256k1(): Promise<void> {
  installationPromise ??= loadAndInstallNativeSecp256k1();
  return await installationPromise;
}

async function loadAndInstallNativeSecp256k1(): Promise<void> {
  try {
    const { getNativeSecp256k1PublicKeyFromSecretKey } =
      await import("hardhat/internal/edr");

    const nativePublicKeyFromSecretKey =
      await getNativeSecp256k1PublicKeyFromSecretKey();

    if (nativePublicKeyFromSecretKey === undefined) {
      log(
        "EDR's native secp256k1 derivation isn't available; keeping ethers' JS one",
      );
      return;
    }

    const jsComputePublicKey = SigningKey.computePublicKey;

    SigningKey.computePublicKey = function (
      key: BytesLike,
      compressed?: boolean,
    ): string {
      const bytes = getBytes(key, "key");

      // Only secret keys are derived natively. The other inputs ethers accepts
      // are public keys being converted between encodings, which is cheap and
      // has more involved semantics, so they are left to ethers.
      if (bytes.length !== SECRET_KEY_LENGTH) {
        return jsComputePublicKey(key, compressed);
      }

      let publicKey;
      try {
        publicKey = nativePublicKeyFromSecretKey(bytes);
      } catch (error) {
        // Invalid secret keys end up here, and ethers' implementation is the
        // reference for how they must be reported, so it produces the error.
        // Anything else that could go wrong is also better served by falling
        // back than by failing.
        log("EDR's native secp256k1 derivation failed: %O", error);
        return jsComputePublicKey(key, compressed);
      }

      nativeCallCount++;

      // ethers defaults this path to the uncompressed encoding.
      if (compressed !== true) {
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
    // Swallowed to avoid breaking users if it's missing.
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
 * correct *and* were produced by the native implementation. A future version of
 * ethers that stops calling `SigningKey.computePublicKey` internally would
 * still return the right values, so correctness alone isn't enough.
 */
function selfCheckPasses(): boolean {
  const callCountBefore = nativeCallCount;

  let address;
  let compressedPublicKey;
  try {
    // Exercises the uncompressed encoding, which `computeAddress` hashes, and
    // the compressed one, through the getter that HD wallets use.
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

  // One derivation each, so a version of ethers that computes either of them
  // some other way is caught, not just one that stops calling the method
  // altogether.
  if (nativeCallCount - callCountBefore < 2) {
    log(
      "This version of ethers doesn't derive public keys through SigningKey.computePublicKey; restoring its JS one",
    );
    return false;
  }

  return true;
}
