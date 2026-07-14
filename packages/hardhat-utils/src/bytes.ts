import { Readable } from "node:stream";

import { buildLpsTable, parseJsonStream } from "./internal/bytes.js";

/**
 * Checks if a value is an instance of Uint8Array.
 *
 * @param value The value to check.
 * @returns True if the value is a Uint8Array, false otherwise.
 */
export function isBytes(value: unknown): value is Uint8Array {
  return value instanceof Uint8Array;
}

/**
 * Pads a Uint8Array with zeros on the left to a specified length, or truncates
 * it from the left if it's too long.
 *
 * @param bytes The Uint8Array to pad or truncate.
 * @param length The desired length of the Uint8Array.
 * @returns The padded or truncated Uint8Array.
 */
export function setLengthLeft(bytes: Uint8Array, length: number): Uint8Array {
  if (bytes.length < length) {
    const padded = new Uint8Array(length);
    padded.set(bytes, length - bytes.length);
    return padded;
  }

  return bytes.subarray(-length);
}

/**
 * Checks if two Uint8Arrays are equal.
 *
 * @param x The first Uint8Array to compare.
 * @param y The second Uint8Array to compare.
 * @returns True if the Uint8Arrays are equal, false otherwise.
 */
export function equalsBytes(x: Uint8Array, y: Uint8Array): boolean {
  return x.length === y.length && x.every((xVal, i) => xVal === y[i]);
}

/**
 * Converts a UTF-8 encoded string into a byte array.
 *
 * @param utf8String The UTF-8 encoded string to convert to bytes.
 * @returns A Uint8Array representing the byte sequence of the input UTF-8 string.
 */
export function utf8StringToBytes(utf8String: string): Uint8Array {
  return new TextEncoder().encode(utf8String);
}

/**
 * Converts a Uint8Array of UTF-8 encoded bytes into a string.
 *
 * @param bytes The UTF-8 encoded byte array to convert.
 * @returns The decoded UTF-8 string.
 */
export function bytesToUtf8String(bytes: Uint8Array): string {
  return new TextDecoder().decode(bytes);
}

/**
 * Checks whether a Uint8Array contains the UTF-8 byte sequence of a given
 * string. Searches the raw bytes without allocating a full string for the
 * haystack. Uses the Knuth-Morris-Pratt (KMP) algorithm for efficient
 * searching.
 *
 * @param haystack The Uint8Array to search in.
 * @param needle The string whose UTF-8 encoding to search for.
 * @returns True if the needle's byte sequence is found in the haystack.
 */
export function bytesIncludesUtf8String(
  haystack: Uint8Array,
  needle: string,
): boolean {
  if (needle.length === 0) {
    return true;
  }

  const needleBytes = utf8StringToBytes(needle);
  const needleLen = needleBytes.length;
  const haystackLen = haystack.length;
  if (needleLen > haystackLen) {
    return false;
  }

  const lps = buildLpsTable(needleBytes);

  let haystackI = 0;
  let needleI = 0;
  while (haystackI < haystackLen) {
    if (haystack[haystackI] === needleBytes[needleI]) {
      haystackI++;
      needleI++;
      if (needleI === needleLen) {
        return true;
      }
    } else if (needleI > 0) {
      needleI = lps[needleI - 1];
    } else {
      haystackI++;
    }
  }

  return false;
}

/**
 * Parses UTF-8 encoded JSON bytes into a value.
 *
 * Payloads that fit in a single string are decoded and parsed with
 * `JSON.parse`, which is much faster. Payloads too large to be held in a
 * single string are parsed as a stream instead, which decodes and parses
 * incrementally rather than materializing the whole payload as one string.
 *
 * @param bytes The UTF-8 encoded JSON bytes.
 * @returns The parsed JSON object.
 */
export async function parseJsonBytes<T>(bytes: Uint8Array): Promise<T> {
  let json: string;
  try {
    json = bytesToUtf8String(bytes);
  } catch {
    // `bytesToUtf8String` decodes non-fatally, so it never throws on malformed
    // bytes; its only failure mode is a payload larger than the maximum string
    // length the runtime can hold. Stream parsing handles those, as it never
    // materializes the whole payload as a single string.
    return await parseJsonStream<T>(Readable.from([bytes]));
  }

  return JSON.parse(json);
}

export { bytesToBigInt, bytesToNumber, numberToBytes } from "./number.js";
export { bytesToHexString, hexStringToBytes } from "./hex.js";
