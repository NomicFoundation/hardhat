import { createDebug } from "@nomicfoundation/hardhat-utils/debug";
import { keccak256 } from "ethers";
import { keccak256 as nativeKeccak256 } from "hardhat/internal/native-crypto";

const log = createDebug("hardhat:ethers:native-keccak256");

let registered = false;

/**
 * Replaces ethers' pure-JS Keccak-256 with EDR's native one, which is
 * significantly faster and is used by virtually every ethers operation: address
 * checksums, ABI selectors and topics, transaction serialization, and CREATE
 * address derivation.
 *
 * Registration is per-module-instance, so this only affects the ethers instance
 * that this plugin resolves; code that resolves another one keeps using the JS
 * implementation. Within this instance it overwrites any implementation
 * registered earlier, as ethers offers no way to detect one. It only registers
 * on its first call, so later connections don't overwrite an implementation
 * registered in between.
 *
 * Both ethers and EDR are imported statically: this module is only loaded on
 * the first network connection, by which point both are already loaded, so
 * there's nothing to defer.
 *
 * If ethers' implementation has been locked, this leaves ethers as it is,
 * reporting it only under DEBUG.
 */
export function registerNativeKeccak256(): void {
  if (registered) {
    return;
  }

  registered = true;

  try {
    keccak256.register(nativeKeccak256);

    log("Registered EDR's native keccak256 into ethers");
  } catch (error) {
    // ethers throws if its keccak256 has been locked. Swallowed so that a
    // locked ethers doesn't break network connections.
    log("Failed to register EDR's native keccak256: %O", error);
  }
}
