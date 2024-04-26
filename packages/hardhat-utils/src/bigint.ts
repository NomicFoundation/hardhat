import { BigIntError } from "./errors/bigint.js";
import { isBNBigInt, isBigNumberBigInt } from "./internal/bigint.js";
import { unreachable } from "./errors/catch-utils.js";

/**
 * Returns the minimum of two BigInts.
 *
 * @param x The first number to compare.
 * @param y The second number to compare.
 * @returns The smaller of the two numbers.
 */
export function min(x: bigint, y: bigint): bigint {
  return x < y ? x : y;
}

/**
 * Returns the maximum of two BigInts.
 *
 * @param x The first number to compare.
 * @param y The second number to compare.
 * @returns The larger of the two numbers.
 */
export function max(x: bigint, y: bigint): bigint {
  return x > y ? x : y;
}

/**
 * Converts a value to a BigInt.
 *
 * This function supports several types of input:
 * - `number`: Must be an integer and a safe integer. If it's not, an error is thrown.
 * - `bigint`: Returned as is.
 * - `string`: Converted to a BigInt using the BigInt constructor.
 * - `object`: Must be an instance of BN or BigNumber. If it's not, an error is thrown.
 *
 * If the input is of an unsupported type, an error is thrown.
 *
 * @param x The value to convert to a BigInt.
 * @returns The input value converted to a BigInt.
 * @throws BigIntError If the input value cannot be converted to a BigInt.
 */
export async function toBigInt(
  x: number | string | bigint | object,
): Promise<bigint> {
  switch (typeof x) {
    case "number":
      if (!Number.isInteger(x)) {
        throw new BigIntError(`${x} is not an integer`);
      }
      if (!Number.isSafeInteger(x)) {
        throw new BigIntError(
          `Integer ${x} is unsafe. Consider using ${x}n instead. For more details, see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/isSafeInteger`,
        );
      }
    // `break;` intentionally omitted. fallthrough desired.
    case "string":
    case "bigint":
      return BigInt(x);
    case "object":
      if (await isLibraryBigInt(x)) {
        return BigInt(x.toString());
      } else {
        throw new BigIntError(
          `Value ${JSON.stringify(x)} is of type "object" but is not an instanceof one of the known big number object types.`,
        );
      }
    default:
      unreachable(x, new BigIntError(`Unsupported type ${typeof x}`));
  }
}

/**
 * Checks if the given value is a BigInt. This function should only be used
 * when the value may be a BigInt from a third-party library, like `bn.js` or
 * `bignumber.js`. To check if a value is a native JavaScript BigInt, use
 * `typeof x === "bigint"`.
 *
 * @param x The value to check.
 * @returns `true` if the value is a BigInt, `false` otherwise.
 */
export async function isLibraryBigInt(x: unknown): Promise<boolean> {
  const [isBNBigIntResult, isBigNumberBigIntResult] = await Promise.all([
    isBNBigInt(x),
    isBigNumberBigInt(x),
  ]);

  return isBNBigIntResult || isBigNumberBigIntResult;
}
