import { HardhatError } from "@nomicfoundation/hardhat-errors";
import { ensureError } from "@nomicfoundation/hardhat-utils/error";
import { createDecimal } from "micro-eth-signer/utils.js";

const UNIT_DECIMALS = new Map([
  ["ether", 18],
  ["gwei", 9],
  ["wei", 0],
]);

// ERC-20's decimals() returns a uint8. This also bounds the size of 10^decimals.
const MAX_DECIMALS = 255;

/**
 * Returns the number of decimals of a unit.
 *
 * @param unit The unit's name: ether, gwei or wei.
 * @returns The number of decimals of the unit.
 * @throws HardhatError If the unit isn't ether, gwei or wei.
 */
export function getUnitDecimals(unit: string): number {
  const decimals = UNIT_DECIMALS.get(unit);

  if (decimals === undefined) {
    throw new HardhatError(HardhatError.ERRORS.CORE.ARGUMENTS.INVALID_VALUE, {
      value: unit,
      name: "unit",
      reason: "it must be ether, gwei or wei",
    });
  }

  return decimals;
}

/**
 * Parses a decimal amount, like 1.5, into an integer, by multiplying it by
 * 10^decimals.
 *
 * @param value The decimal amount, from the `value` task argument.
 * @param decimals The number of decimals, from 0 to 255.
 * @returns The integer.
 * @throws HardhatError If the amount isn't a decimal number, it has more than
 * `decimals` decimal places, or the decimals are out of range.
 */
export function parseUnits(value: string, decimals: number): bigint {
  const coder = createDecimalCoder(decimals);

  try {
    return coder.decode(value);
  } catch (error) {
    ensureError(error);

    throw new HardhatError(
      HardhatError.ERRORS.CORE.ARGUMENTS.INVALID_VALUE,
      {
        value,
        name: "value",
        reason: `it must be a decimal number like 1.5, with at most ${decimals} decimal places`,
      },
      error,
    );
  }
}

/**
 * Formats an integer as a decimal amount, by dividing it by 10^decimals.
 *
 * @param value The integer.
 * @param decimals The number of decimals, from 0 to 255.
 * @returns The decimal amount, without trailing zeros, like 1.5.
 * @throws HardhatError If the decimals are out of range.
 */
export function formatUnits(value: bigint, decimals: number): string {
  return createDecimalCoder(decimals).encode(value);
}

function createDecimalCoder(
  decimals: number,
): ReturnType<typeof createDecimal> {
  if (decimals < 0 || decimals > MAX_DECIMALS) {
    throw new HardhatError(HardhatError.ERRORS.CORE.ARGUMENTS.INVALID_VALUE, {
      value: decimals,
      name: "decimals",
      reason: `it must be between 0 and ${MAX_DECIMALS}`,
    });
  }

  return createDecimal(decimals);
}
