import { isBytes } from "@nomicfoundation/hardhat-utils/bytes";
import { bytesToHexString } from "@nomicfoundation/hardhat-utils/hex";

/**
 * Formats a decoded value to print it: integers in decimal, bytes as hex,
 * strings as they are, arrays and tuples as JSON, as `abi encode-*` takes them.
 *
 * @param value The decoded value.
 * @returns The formatted value.
 */
export function formatAbiValue(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }

  if (isBytes(value)) {
    return bytesToHexString(value);
  }

  return formatJsonValue(value);
}

// Integers become JSON numbers, exact beyond 2^53
function formatJsonValue(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(formatJsonValue).join(",")}]`;
  }

  if (typeof value === "bigint") {
    return value.toString();
  }

  return JSON.stringify(isBytes(value) ? bytesToHexString(value) : value);
}
