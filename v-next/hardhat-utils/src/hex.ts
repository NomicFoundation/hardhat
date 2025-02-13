import { InvalidParameterError } from "./common-errors.js";
import { padToEven } from "./internal/hex.js";

export type PrefixedHexString = `0x${string}`;

/**
 * Converts a non-negative safe integer or bigint to a hexadecimal string.
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
      `Expected a non-negative safe integer or bigint. Received: ${value}`,
    );
  }

  return `0x${value.toString(16)}`;
}

/**
 * Converts a hexadecimal string to a bigint. The string must be a valid
 * hexadecimal string. The string may be prefixed with "0x" or not. The
 * empty string is considered a valid hexadecimal string, so is the string
 * "0x" and will be converted to 0.
 *
 * @param hexString The hexadecimal string to convert. It must be a valid
 * hexadecimal string.
 * @returns The bigint representation of the hexadecimal string.
 * @throws InvalidParameterError If the input is not a hexadecimal string.
 */
export function hexStringToBigInt(hexString: string): bigint {
  if (!isHexString(hexString)) {
    throw new InvalidParameterError(
      `Expected a valid hexadecimal string. Received: ${hexString}`,
    );
  }
  // Prefix the string as it is required to make BigInt interpret it as a
  // hexadecimal number.
  let prefixedHexString = getPrefixedHexString(hexString);
  // BigInt does not support "0x" as a valid hexadecimal number, so we need to
  // add a zero after the prefix if the string is "0x".
  prefixedHexString = prefixedHexString === "0x" ? "0x0" : prefixedHexString;

  const bigInt = BigInt(prefixedHexString);

  return bigInt;
}

/**
 * Converts a hexadecimal string to a number. The string must be a valid
 * hexadecimal string. The string may be prefixed with "0x" or not. The
 * empty string is considered a valid hexadecimal string, so is the string
 * "0x" and will be converted to 0.
 *
 * @param hexString The hexadecimal string to convert. It must be a valid
 * hexadecimal string.
 * @returns The number representation of the hexadecimal string.
 * @throws InvalidParameterError If the input is not a hexadecimal string or the value exceeds the Number.MAX_SAFE_INTEGER limit.
 */
export function hexStringToNumber(hexString: string): number {
  if (!isHexString(hexString)) {
    throw new InvalidParameterError(
      `Expected a valid hexadecimal string. Received: ${hexString}`,
    );
  }

  // Prefix the string as it is required to make parseInt interpret it as a
  // hexadecimal number.
  let prefixedHexString = getPrefixedHexString(hexString);

  // Handle the special case where the string is "0x".
  prefixedHexString = prefixedHexString === "0x" ? "0x0" : prefixedHexString;

  const numberValue = parseInt(prefixedHexString, 16);

  if (numberValue > Number.MAX_SAFE_INTEGER) {
    throw new InvalidParameterError(
      `Value exceeds the safe integer limit. Received: ${hexString}`,
    );
  }

  return numberValue;
}

/**
 * Converts a Uint8Array to a hexadecimal string.
 *
 * @param bytes The bytes to convert.
 * @returns PrefixedHexString The hexadecimal representation of the bytes.
 */
export function bytesToHexString(bytes: Uint8Array): PrefixedHexString {
  return getPrefixedHexString(Buffer.from(bytes).toString("hex"));
}

/**
 * Converts a hexadecimal string to a Uint8Array. The string must be a valid
 * hexadecimal string. The string may be prefixed with "0x" or not. The empty
 * string is considered a valid hexadecimal string, so is the string "0x" and
 * will be converted to Uint8Array([0]).
 *
 * @param hexString The hexadecimal string to convert.
 * @returns The byte representation of the hexadecimal string.
 * @throws InvalidParameterError If the input is not a hexadecimal string.
 */
export function hexStringToBytes(hexString: string): Uint8Array {
  if (!isHexString(hexString)) {
    throw new InvalidParameterError(
      `Expected a valid hexadecimal string. Received: ${hexString}`,
    );
  }

  // Pad the hex string if it's odd, as Buffer.from will truncate it
  // the last character if it's not a full byte.
  // See: https://nodejs.org/api/buffer.html#buffers-and-character-encodings
  const unprefixedHexString = getUnprefixedHexString(padToEven(hexString));
  return Uint8Array.from(Buffer.from(unprefixedHexString, "hex"));
}

/**
 * Normalizes and validates a string that represents a hexadecimal number.
 * The normalization process includes trimming any leading or trailing
 * whitespace, converting all characters to lowercase, and ensuring the string
 * has a "0x" prefix. The validation process checks if the string is a valid
 * hexadecimal string.
 *
 * @param hexString The hex string to normalize.
 * @returns The normalized hexadecimal string.
 */
export function normalizeHexString(hexString: string): PrefixedHexString {
  const normalizedHexString = hexString.trim().toLowerCase();

  if (!isHexString(normalizedHexString)) {
    throw new InvalidParameterError(
      `Expected a valid hexadecimal string. Received: ${hexString}`,
    );
  }

  return getPrefixedHexString(normalizedHexString);
}

/**
 * Checks if a string starts with "0x" (case-insensitive).
 * This function does not validate the input.
 *
 * @param hexString The string to check.
 * @returns True if the string starts with "0x", false otherwise.
 */
export function isPrefixedHexString(
  hexString: string,
): hexString is PrefixedHexString {
  return hexString.toLowerCase().startsWith("0x");
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
  return isPrefixedHexString(hexString) ? hexString.substring(2) : hexString;
}

/**
 * Adds the "0x" prefix to a hexadecimal string.
 * If the string is already prefixed, it is returned as is.
 * This function does not validate the input.
 *
 * @param hexString The hexadecimal string.
 * @returns The hexadecimal string with the "0x" prefix.
 */
export function getPrefixedHexString(hexString: string): PrefixedHexString {
  return isPrefixedHexString(hexString) ? hexString : `0x${hexString}`;
}

/**
 * Checks if a value is a hexadecimal string. The string may be prefixed with
 * "0x" or not. The empty string is considered a valid hexadecimal string, so
 * is the string "0x".
 *
 * @param value The value to check.
 * @returns True if the value is a hexadecimal string, false otherwise.
 */
export function isHexString(value: unknown): boolean {
  return typeof value === "string" && /^(?:0x)?[0-9a-f]*$/i.test(value);
}

/**
 * Removes leading zeros from a hexadecimal string, unless the string
 * represents the number zero ("0x0").
 * This function does not validate the input.
 *
 * @param hexString The hexadecimal string.
 * @returns The hexadecimal string without leading zeros.
 */
export function unpadHexString(hexString: string): string {
  const unprefixedHexString = getUnprefixedHexString(hexString);
  const unpaddedHexString = unprefixedHexString.replace(/^0+/, "");
  return unpaddedHexString === "" ? "0x0" : `0x${unpaddedHexString}`;
}

/**
 * Pads a hexadecimal string with zeros on the left to a specified length, or
 * truncates it from the left if it's too long.
 * This function does not validate the input.
 *
 * @param hexString The hexadecimal string to pad.
 * @param length The desired length of the hexadecimal string.
 * @returns The padded hexadecimal string.
 */
export function setLengthLeft(
  hexString: string,
  length: number,
): PrefixedHexString {
  const unprefixedHexString = getUnprefixedHexString(hexString);

  // if the string is longer than the desired length, truncate it
  if (unprefixedHexString.length > length) {
    return `0x${unprefixedHexString.slice(-length)}`;
  }

  const paddedHexString = unprefixedHexString.padStart(length, "0");
  return `0x${paddedHexString}`;
}
