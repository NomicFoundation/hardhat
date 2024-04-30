import { InvalidParameterError } from "./errors/hex.js";

export type PrefixedHexString = `0x${string}`;

/**
 * Converts a non-negative safe integer or BigInt to a hexadecimal string.
 *
 * @param value The number to convert.
 * @returns The hexadecimal representation of the number.
 * @throws InvalidParameterError If the input is not a safe integer or is negative.
 */
export function numberToHexString(value: number | bigint): PrefixedHexString {
  if (
    value < 0 ||
    (typeof value === "number" && !Number.isSafeInteger(value))
  ) {
    throw new InvalidParameterError(
      `Expected a non-negative safe integer or BigInt. Received: ${value}`,
    );
  }

  return `0x${value.toString(16)}`;
}

/**
 * Converts a hexadecimal string to a number or BigInt if the number is an
 * unsafe integer.
 *
 * @param hexString The hexadecimal string to convert. It must be a valid
 * hexadecimal string starting with "0x".
 * @returns The number representation of the hexadecimal string.
 * @throws InvalidParameterError If the input is not a hexadecimal string.
 */
export function hexStringToNumber(hexString: string): number | bigint {
  if (!isHexString(hexString)) {
    throw new InvalidParameterError(
      `Expected a hexadecimal string starting with '0x'. Received: ${hexString}`,
    );
  }

  const bigInt = BigInt(hexString);

  if (bigInt <= Number.MAX_SAFE_INTEGER) {
    return Number(bigInt);
  }

  return bigInt;
}

/**
 * Converts a Uint8Array to a hexadecimal string.
 *
 * @param value The bytes to convert.
 * @returns PrefixedHexString The hexadecimal representation of the bytes.
 */
export function bytesToHexString(value: Uint8Array): PrefixedHexString {
  return `0x${Buffer.from(value).toString("hex")}`;
}

/**
 * Converts a hexadecimal string to a Uint8Array.
 *
 * @param hexString The hexadecimal string to convert.
 * @returns The byte representation of the hexadecimal string.
 * @throws InvalidParameterError If the input is not a hexadecimal string.
 */
export function hexStringToBytes(hexString: string): Uint8Array {
  if (!isHexString(hexString)) {
    throw new InvalidParameterError(
      `Expected a hexadecimal string starting with '0x'. Received: ${hexString}`,
    );
  }

  return Uint8Array.from(Buffer.from(getUnprefixedHexString(hexString), "hex"));
}

/**
 * Normalizes a string that represents a hexadecimal number.
 * The normalization process includes trimming any leading or trailing
 * whitespace, converting all characters to lowercase, and ensuring the string
 * has a "0x" prefix.
 * This function does not validate the input.
 *
 * @param hexString The hex string to normalize.
 * @returns The normalized hexadecimal string.
 */
export function normalizeHexString(hexString: string): PrefixedHexString {
  const normalizedHexString = hexString.trim().toLowerCase();
  return isHexStringPrefixed(normalizedHexString)
    ? (normalizedHexString as PrefixedHexString)
    : `0x${normalizedHexString}`;
}

/**
 * Checks if a string starts with "0x".
 * This function does not validate the input.
 *
 * @param hexString The string to check.
 * @returns True if the string starts with "0x", false otherwise.
 */
export function isHexStringPrefixed(hexString: string): boolean {
  return hexString.toLowerCase().startsWith("0x");
}

/**
 * Checks if a string is a hexadecimal string.
 *
 * @param value The string to check.
 * @returns True if the string is a hexadecimal string, false otherwise.
 */
export function isHexString(value: string): boolean {
  return /^0x[0-9a-f]*$/i.test(value);
}

/**
 * Removes the "0x" prefix from a hexadecimal string.
 * If the string is not prefixed, it is returned as is.
 * This function does not validate the input.
 *
 * @param hexString The hexadecimal string.
 * @returns The hexadecimal string without the "0x" prefix.
 */
export function getUnprefixedHexString(hexString: string): string {
  return isHexStringPrefixed(hexString) ? hexString.substring(2) : hexString;
}

/**
 * Removes leading zeros from a hexadecimal string, unless the string
 * represents the number zero ("0x0").
 * This function does not validate the input.
 *
 * @param hexString The hexadecimal string.
 * @returns The hexadecimal string without leading zeros.
 */
export function unpadHexString(hexString: string) {
  const unpaddedHexString = hexString.replace(/^0x0+/i, "0x");
  return unpaddedHexString === "0x" ? "0x0" : unpaddedHexString;
}
