import type { PrefixedHexString } from "./hex.js";

import { InvalidParameterError } from "./common-errors.js";
import { bytesToHexString, numberToHexString, setLengthLeft } from "./hex.js";
import {
  getAddressGenerator,
  getHashGenerator,
  isValidChecksum,
  toChecksumAddress as toChecksumAddressImpl,
} from "./internal/eth.js";

/**
 * Checks if a value is an Ethereum address.
 *
 * @param value The value to check.
 * @returns True if the value is an Ethereum address, false otherwise.
 */
export function isAddress(value: unknown): value is PrefixedHexString {
  return typeof value === "string" && /^0x[0-9a-f]{40}$/i.test(value);
}

/**
 * Checks if a value is an Ethereum address and if the checksum is valid.
 *
 * @param value The value to check.
 * @returns True if the value is an Ethereum address with a valid checksum, false otherwise.
 */
export async function isValidChecksumAddress(value: unknown): Promise<boolean> {
  return await (isAddress(value) && isValidChecksum(value));
}

/**
 * Converts an Ethereum address to its EIP-55 checksummed representation.
 *
 * @param address The address to convert. It can be checksummed or not, but it
 * must be a valid Ethereum address.
 * @returns The EIP-55 checksummed representation of the address.
 * @throws InvalidParameterError If the input is not an Ethereum address.
 */
export async function toChecksumAddress(
  address: string,
): Promise<PrefixedHexString> {
  if (!isAddress(address)) {
    throw new InvalidParameterError(
      `Expected an Ethereum address. Received: ${address}`,
    );
  }

  return await toChecksumAddressImpl(address);
}

/**
 * Checks if a value is an Ethereum hash.
 *
 * @param value The value to check.
 * @returns True if the value is an Ethereum hash, false otherwise.
 */
export function isHash(value: unknown): value is PrefixedHexString {
  return typeof value === "string" && /^0x[0-9a-f]{64}$/i.test(value);
}

/**
 * Converts a number to a hexadecimal string with a length of 32 bytes.
 *
 * @param value The number to convert.
 * @returns The hexadecimal representation of the number padded to 32 bytes.
 * @throws InvalidParameterError If the input is not a safe integer or is negative.
 */
export function toEvmWord(value: bigint | number): PrefixedHexString {
  return setLengthLeft(numberToHexString(value), 64);
}

/**
 * Generates a pseudo-random sequence of hash bytes.
 *
 * @returns A pseudo-random sequence of hash bytes.
 */
export async function generateHashBytes(): Promise<Uint8Array> {
  const hashGenerator = await getHashGenerator();
  return await hashGenerator.next();
}

/**
 * Generates a pseudo-random hash.
 *
 * @returns A pseudo-random hash.
 */
export async function randomHash(): Promise<PrefixedHexString> {
  const hashBytes = await generateHashBytes();
  return bytesToHexString(hashBytes);
}

/**
 * Generates a pseudo-random sequence of hash bytes that can be used as an
 * address.
 *
 * @returns A pseudo-random sequence of hash bytes.
 */
export async function generateAddressBytes(): Promise<Uint8Array> {
  const addressGenerator = await getAddressGenerator();
  const hashBytes = await addressGenerator.next();
  return hashBytes.slice(0, 20);
}

/**
 * Generates a pseudo-random address.
 *
 * @returns A pseudo-random address.
 */
export async function randomAddress(): Promise<PrefixedHexString> {
  const addressBytes = await generateAddressBytes();
  return bytesToHexString(addressBytes);
}
