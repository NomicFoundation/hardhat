import type { PrefixedHexString } from "@nomicfoundation/hardhat-utils/hex";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import { isHash } from "@nomicfoundation/hardhat-utils/eth";
import {
  normalizeHexString,
  numberToHexString,
} from "@nomicfoundation/hardhat-utils/hex";

const BLOCK_TAGS = new Set([
  "latest",
  "pending",
  "earliest",
  "safe",
  "finalized",
]);

const BLOCK_NUMBER_PATTERN = /^(?:\d+|0x[\da-f]+)$/i;

/**
 * Parses a block task argument into a JSON-RPC block parameter.
 *
 * @param value A block tag, a decimal or hex number, or a block hash.
 * @param name The task argument's name, for errors.
 * @returns The tag, the number as a hex quantity, or an EIP-1898
 * `{ blockHash }`, as not every node takes a bare hash.
 * @throws HardhatError If the value is none of those.
 */
export function parseBlockArgument(
  value: string,
  name: string,
): string | { blockHash: PrefixedHexString } {
  if (BLOCK_TAGS.has(value)) {
    return value;
  }

  // Lowercased, as some nodes reject a "0X" prefix
  if (isHash(value)) {
    return { blockHash: normalizeHexString(value) };
  }

  if (BLOCK_NUMBER_PATTERN.test(value)) {
    return numberToHexString(BigInt(value));
  }

  throw new HardhatError(HardhatError.ERRORS.CORE.ARGUMENTS.INVALID_VALUE, {
    value,
    name,
    reason:
      "it must be a block number, a block hash, or one of latest, pending, earliest, safe and finalized",
  });
}
