import { createDebug } from "@nomicfoundation/hardhat-utils/debug";
import { keccak256 } from "ethers";

const log = createDebug("hardhat:ethers:native-keccak256");

let registrationPromise: Promise<void> | undefined;

/**
 * Replaces ethers' pure-JS Keccak-256 with EDR's native one, which is
 * significantly faster and is used by virtually every ethers operation: address
 * checksums, ABI selectors and topics, transaction serialization, and CREATE
 * address derivation.
 *
 * Registration is per-module-instance, so this only affects the ethers instance
 * that this plugin resolves; code that resolves another one keeps using the JS
 * implementation. Within this instance it overwrites any implementation
 * registered earlier, as ethers offers no way to detect one.
 *
 * If the native implementation isn't available, or ethers' implementation has
 * been locked, this leaves ethers as it is, reporting it only under DEBUG.
 */
export async function registerNativeKeccak256(): Promise<void> {
  registrationPromise ??= loadAndRegisterNativeKeccak256();
  return await registrationPromise;
}

async function loadAndRegisterNativeKeccak256(): Promise<void> {
  try {
    const { getNativeKeccak256 } = await import("hardhat/internal/edr");

    const nativeKeccak256 = await getNativeKeccak256();

    if (nativeKeccak256 === undefined) {
      log("EDR's native keccak256 isn't available; keeping ethers' JS one");
      return;
    }

    keccak256.register(nativeKeccak256);

    log("Registered EDR's native keccak256 into ethers");
  } catch (error) {
    // Swallowed to avoid breaking users if it's missing.
    log("Failed to register EDR's native keccak256: %O", error);
  }
}
