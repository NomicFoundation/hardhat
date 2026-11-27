import type { PrefixedHexString } from "@nomicfoundation/hardhat-utils/hex";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import {
  isAddress,
  isValidChecksumAddress,
} from "@nomicfoundation/hardhat-utils/eth";
import { normalizeHexString } from "@nomicfoundation/hardhat-utils/hex";

/**
 * Parses an address task argument.
 *
 * @param value The argument's value.
 * @param name The task argument's name, for errors.
 * @returns The address, lowercased, as some nodes reject a "0X" prefix.
 * @throws HardhatError If it isn't an address, or if it's mixed-case and its
 * EIP-55 checksum is invalid.
 */
export async function parseAddressArgument(
  value: string,
  name: string,
): Promise<PrefixedHexString> {
  if (!isAddress(value)) {
    throw new HardhatError(HardhatError.ERRORS.CORE.ARGUMENTS.INVALID_VALUE, {
      value,
      name,
      reason: "it must be a valid Ethereum address",
    });
  }

  // Mixed-case addresses must pass the EIP-55 checksum, like ABI-encoded ones,
  // to catch typos. The prefix can be "0X".
  const hex = value.slice(2);
  if (
    hex !== hex.toLowerCase() &&
    hex !== hex.toUpperCase() &&
    !(await isValidChecksumAddress(`0x${hex}`))
  ) {
    throw new HardhatError(HardhatError.ERRORS.CORE.ARGUMENTS.INVALID_VALUE, {
      value,
      name,
      reason: "it has an invalid address checksum",
    });
  }

  return normalizeHexString(value);
}
