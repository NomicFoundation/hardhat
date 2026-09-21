/**
 * The signedness and size of a Solidity integer type.
 */
export interface IntType {
  readonly signed: boolean;
  readonly bits: number;
}

/**
 * The inclusive range of values that a Solidity integer type can hold.
 */
export interface IntTypeRange {
  readonly min: bigint;
  readonly max: bigint;
}

const INT_TYPE_PATTERN = /^(u?)int([1-9]\d*)?$/;

/**
 * Parses a Solidity integer type name, like `uint256` or `int128`, into its
 * signedness and size in bits. As in Solidity, `uint` and `int` are accepted as
 * aliases of the 256-bit types.
 *
 * @param type The type name to parse.
 * @returns The parsed type, or `undefined` if it isn't a Solidity integer type.
 */
export function parseIntType(type: string): IntType | undefined {
  const match = INT_TYPE_PATTERN.exec(type);

  if (match === null) {
    return undefined;
  }

  const bits = match[2] === undefined ? 256 : Number(match[2]);

  if (bits > 256 || bits % 8 !== 0) {
    return undefined;
  }

  return { signed: match[1] === "", bits };
}

/**
 * Returns the inclusive range of values that a Solidity integer type can hold.
 *
 * @param intType The integer type, as returned by {@link parseIntType}.
 * @returns The minimum and maximum values of the type.
 */
export function getIntTypeRange({ signed, bits }: IntType): IntTypeRange {
  if (signed) {
    const bound = 2n ** BigInt(bits - 1);
    return { min: -bound, max: bound - 1n };
  }

  return { min: 0n, max: 2n ** BigInt(bits) - 1n };
}
