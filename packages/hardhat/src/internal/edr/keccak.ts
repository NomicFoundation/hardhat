import { createDebug } from "@nomicfoundation/hardhat-utils/debug";

const log = createDebug("hardhat:core:edr:keccak");

/**
 * A Keccak-256 implementation: takes arbitrary bytes, returns the 32-byte
 * digest.
 */
export type Keccak256 = (data: Uint8Array) => Uint8Array;

let keccak256Promise: Promise<Keccak256 | undefined> | undefined;

/**
 * Returns EDR's native Keccak-256 implementation, or `undefined` if it isn't
 * available in this installation.
 *
 * It is meant to be used to replace pure-JS implementations, which are
 * significantly slower. Callers must handle `undefined` by keeping the JS
 * implementation they would otherwise use.
 *
 * The result is cached for the lifetime of the process, including the
 * `undefined` of a failed load: EDR's availability can't change while the
 * process is running, so a failure is never retried.
 */
export async function getNativeKeccak256(): Promise<Keccak256 | undefined> {
  keccak256Promise ??= loadNativeKeccak256();
  return await keccak256Promise;
}

async function loadNativeKeccak256(): Promise<Keccak256 | undefined> {
  try {
    const edr = await import("@nomicfoundation/edr");

    /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions --
    EDR versions older than the one that introduced the native keccak256 don't
    declare it, so destructuring it directly wouldn't compile against them. The
    check below validates the assertion at runtime. */
    const { keccak256 } = edr as { keccak256?: Keccak256 };

    if (typeof keccak256 !== "function") {
      log("This version of EDR doesn't export a native keccak256");
      return undefined;
    }

    return keccak256;
  } catch (error) {
    // Swallowed to avoid breaking users if it's missing.
    log("Failed to load EDR's native keccak256: %O", error);
    return undefined;
  }
}
