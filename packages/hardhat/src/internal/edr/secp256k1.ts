import { createDebug } from "@nomicfoundation/hardhat-utils/debug";

const log = createDebug("hardhat:core:edr:secp256k1");

/**
 * A secp256k1 public key derivation: takes a 32-byte secret key, returns the
 * 65-byte uncompressed public key (`0x04 || X || Y`).
 *
 * Throws if the secret key isn't a valid scalar in `[1, n)`.
 */
export type Secp256k1PublicKeyFromSecretKey = (
  secretKey: Uint8Array,
) => Uint8Array;

let publicKeyFromSecretKeyPromise:
  Promise<Secp256k1PublicKeyFromSecretKey | undefined> | undefined;

/**
 * Returns EDR's native secp256k1 public key derivation, or `undefined` if it
 * isn't available in this installation.
 *
 * It is meant to be used to replace pure-JS implementations, which are
 * significantly slower. Callers must handle `undefined` by keeping the JS
 * implementation they would otherwise use.
 *
 * The result is cached for the lifetime of the process, including the
 * `undefined` of a failed load: EDR's availability can't change while the
 * process is running, so a failure is never retried.
 */
export async function getNativeSecp256k1PublicKeyFromSecretKey(): Promise<
  Secp256k1PublicKeyFromSecretKey | undefined
> {
  publicKeyFromSecretKeyPromise ??= loadNativePublicKeyFromSecretKey();
  return await publicKeyFromSecretKeyPromise;
}

async function loadNativePublicKeyFromSecretKey(): Promise<
  Secp256k1PublicKeyFromSecretKey | undefined
> {
  try {
    const edr = await import("@nomicfoundation/edr");

    /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions --
    EDR versions older than the one that introduced the native secp256k1
    derivation don't declare it, so destructuring it directly wouldn't compile
    against them. The check below validates the assertion at runtime. */
    const { secp256k1PublicKeyFromSecretKey } = edr as {
      secp256k1PublicKeyFromSecretKey?: Secp256k1PublicKeyFromSecretKey;
    };

    if (typeof secp256k1PublicKeyFromSecretKey !== "function") {
      log(
        "This version of EDR doesn't export a native secp256k1 public key derivation",
      );
      return undefined;
    }

    return secp256k1PublicKeyFromSecretKey;
  } catch (error) {
    // Swallowed to avoid breaking users if it's missing.
    log("Failed to load EDR's native secp256k1 derivation: %O", error);
    return undefined;
  }
}
