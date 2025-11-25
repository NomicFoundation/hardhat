import { numberToHexString } from "./hex.js";
import { panicErrorCodeToReason } from "./internal/panic-errors.js";

/**
 * Converts a Solidity panic error code into a human-readable revert message.
 *
 * Solidity defines a set of standardized panic codes (0x01, 0x11, etc.)
 * that represent specific runtime errors (e.g. arithmetic overflow).
 * This function looks up the corresponding reason string and formats it
 * into a message similar to what clients like Hardhat or ethers.js display.
 *
 * @param errorCode The panic error code returned by the EVM as a bigint.
 * @returns A formatted message string:
 * - `"reverted with panic code <hex> (<reason>)"` if the code is recognized.
 * - `"reverted with unknown panic code <hex>"` if the code is not recognized.
 */
export function panicErrorCodeToMessage(errorCode: bigint): string {
  const reason = panicErrorCodeToReason(errorCode);

  if (reason !== undefined) {
    return `reverted with panic code ${numberToHexString(errorCode)} (${reason})`;
  }

  return `reverted with unknown panic code ${numberToHexString(errorCode)}`;
}
