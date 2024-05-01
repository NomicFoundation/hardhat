import type { PrefixedHexString } from "./hex.js";

import { unreachable } from "./errors/catch-utils.js";
import { InvalidParameterError } from "./errors/custom-errors.js";
import { hexStringToBytes } from "./hex.js";
import { numberToBytes } from "./number.js";

/**
 * Checks if a value is an instance of Uint8Array.
 *
 * @param value The value to check.
 * @returns True if the value is a Uint8Array, false otherwise.
 */
export function isBytes(value: unknown): boolean {
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

export type ToBytesParamTypes =
  | null
  | undefined
  | number[]
  | Uint8Array
  | string
  | number
  | bigint;

/**
 * Converts a value to a Uint8Array.
 *
 * @param value The value to convert.
 * @returns The converted Uint8Array.
 * @throws InvalidParameterError If the value cannot be converted to bytes.
 */
export function toBytes(value: ToBytesParamTypes): Uint8Array {
  if (value === null || value === undefined) {
    return new Uint8Array();
  }

  if (Array.isArray(value) || value instanceof Uint8Array) {
    return Uint8Array.from(value);
  }

  if (typeof value === "string") {
    return hexStringToBytes(value as PrefixedHexString);
  }

  if (typeof value === "number" || typeof value === "bigint") {
    return numberToBytes(value);
  }

  unreachable(
    value,
    new InvalidParameterError(`Unsupported type: ${typeof value}`),
  );
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

export { signedBytesToBigInt } from "./bigint.js";
export { bytesToNumber, numberToBytes } from "./number.js";
export { bytesToHexString, hexStringToBytes } from "./hex.js";
