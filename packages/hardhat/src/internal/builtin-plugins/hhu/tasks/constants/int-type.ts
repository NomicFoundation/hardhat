import { HardhatError } from "@nomicfoundation/hardhat-errors";

const INT_TYPE_PATTERN = /^(u?)int([1-9]\d*)?$/;

/**
 * Parses a Solidity integer type name, like `uint256` or `int128`, into its
 * signedness and size in bits. As in Solidity, `uint` and `int` are accepted as
 * aliases of the 256-bit types.
 *
 * @throws HardhatError if it's not a valid Solidity integer type.
 */
export function parseIntType(type: string): {
  signed: boolean;
  bits: number;
} {
  const match = INT_TYPE_PATTERN.exec(type);

  if (match !== null) {
    const bits = match[2] === undefined ? 256 : Number(match[2]);

    if (bits <= 256 && bits % 8 === 0) {
      return { signed: match[1] === "", bits };
    }
  }

  throw new HardhatError(HardhatError.ERRORS.CORE.ARGUMENTS.INVALID_VALUE, {
    value: type,
    name: "type",
    reason: "it must be a Solidity integer type, like uint256 or int128",
  });
}
