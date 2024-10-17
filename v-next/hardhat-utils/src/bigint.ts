import { InvalidParameterError } from "./common-errors.js";
import { unreachable } from "./error.js";

/**
 * Returns the minimum of two bigints.
 *
 * @param x The first number to compare.
 * @param y The second number to compare.
 * @returns The smaller of the two numbers.
 */
export function min(x: bigint, y: bigint): bigint {
  return x < y ? x : y;
}

/**
 * Returns the maximum of two bigints.
 *
 * @param x The first number to compare.
 * @param y The second number to compare.
 * @returns The larger of the two numbers.
 */
export function max(x: bigint, y: bigint): bigint {
  return x > y ? x : y;
}

/**
 * Converts a value to a bigint.
 *
 * This function supports several types of input:
 * - `number`: Must be an integer and a safe integer. If it's not, an error is thrown.
 * - `bigint`: Returned as is.
 * - `string`: Converted to a bigint using the BigInt constructor.
 *
 * If the input is of an unsupported type, an error is thrown.
 *
 * @param value The value to convert to a bigint.
 * @returns The input value converted to a bigint.
 * @throws InvalidParameterError If the input value cannot be converted to a bigint.
 */
export function toBigInt(value: number | string | bigint): bigint {
  switch (typeof value) {
    case "number":
      if (!Number.isInteger(value)) {
        throw new InvalidParameterError(`${value} is not an integer`);
      }
      if (!Number.isSafeInteger(value)) {
        throw new InvalidParameterError(
          `Integer ${value} is unsafe. Consider using ${value}n instead. For more details, see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/isSafeInteger`,
        );
      }
    // `break;` intentionally omitted. fallthrough desired.
    case "string":
    case "bigint":
      return BigInt(value);
    default:
      unreachable(
        value,
        new InvalidParameterError(`Unsupported type: ${typeof value}`),
      );
  }
}
