import type { PrefixedHexString } from "./hex.js";

import { LinkReferenceError } from "./errors/eth.js";
import {
  bytesToHexString,
  getPrefixedHexString,
  getUnprefixedHexString,
  numberToHexString,
  setLengthLeft,
} from "./hex.js";
import {
  getAddressGenerator,
  getHashGenerator,
  isValidChecksum,
} from "./internal/eth.js";

/**
 * Represents an Ethereum address.
 *
 * Note: TypeScript does not have a way to represent strings with a fixed
 * length, so we use an alias to represent addresses starting with "0x".
 * If you need to validate the address, you can use the `isAddress` function.
 */
export type Address = PrefixedHexString;

/**
 * Represents a hash value.
 *
 * Note: TypeScript does not have a way to represent strings with a fixed
 * length, so we use an alias to represent hashes starting with "0x".
 * If you need to validate the hash, you can use the `isHash` function.
 */
export type Hash = PrefixedHexString;

/**
 * A map of library names to their addresses. The keys can be contract names or
 * fully qualified names in the form `sourceName:contractName`.
 */
export interface LibraryAddresses {
  [contractName: string]: Address;
}

/**
 * Represents a library reference.
 */
export interface Library {
  sourceName: string;
  contractName: string;
  address: Address;
}

/**
 * Checks if a value is an Ethereum address.
 *
 * @param value The value to check.
 * @returns True if the value is an Ethereum address, false otherwise.
 */
export function isAddress(value: unknown): value is Address {
  return typeof value === "string" && /^0x[0-9a-f]{40}$/i.test(value);
}

/**
 * Checks if a value is an Ethereum address and if the checksum is valid.
 *
 * @param value The value to check.
 * @returns True if the value is an Ethereum address with a valid checksum, false otherwise.
 */
export async function isValidChecksumAddress(value: unknown): Promise<boolean> {
  return isAddress(value) && isValidChecksum(value);
}

/**
 * Checks if a value is an Ethereum hash.
 *
 * @param value The value to check.
 * @returns True if the value is an Ethereum hash, false otherwise.
 */
export function isHash(value: unknown): value is Hash {
  return typeof value === "string" && /^0x[0-9a-f]{64}$/i.test(value);
}

/**
 * Converts a number to a hexadecimal string with a length of 32 bytes.
 *
 * @param value The number to convert.
 * @returns The hexadecimal representation of the number padded to 32 bytes.
 * @throws InvalidParameterError If the input is not a safe integer or is negative.
 */
export function toEvmWord(value: bigint | number): Hash {
  return setLengthLeft(numberToHexString(value), 64);
}

/**
 * Generates a pseudo-random sequence of hash bytes.
 *
 * @returns A pseudo-random sequence of hash bytes.
 */
export async function generateHashBytes(): Promise<Uint8Array> {
  const hashGenerator = await getHashGenerator();
  return hashGenerator.next();
}

/**
 * Generates a pseudo-random hash.
 *
 * @returns A pseudo-random hash.
 */
export async function randomHash(): Promise<Hash> {
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
export async function randomAddress(): Promise<Address> {
  const addressBytes = await generateAddressBytes();
  return bytesToHexString(addressBytes);
}

interface Artifact {
  bytecode: string;
  linkReferences: {
    [sourceName: string]: {
      [libraryName: string]: Array<{ start: number; length: number }>;
    };
  };
}

/**
 * Links the bytecode of a contract with the provided library addresses.
 *
 * This function replaces placeholders in the bytecode with the actual
 * addresses of the libraries. It throws an error if the link references
 * for a library are undefined.
 *
 * @param artifact The artifact containing the bytecode and link references.
 * @param libraries An array of libraries with their source names, contract
 * names, and addresses.
 * @returns The linked bytecode as a prefixed hexadecimal string.
 * @throws LinkReferenceError If the link references for a library are undefined.
 */
export function linkBytecode(
  artifact: Artifact,
  libraries: Library[],
): PrefixedHexString {
  const { bytecode, linkReferences } = artifact;
  let linkedBytecode = bytecode;

  for (const { sourceName, contractName, address } of libraries) {
    const contractLinkReferences = linkReferences[sourceName]?.[contractName];

    if (contractLinkReferences === undefined) {
      throw new LinkReferenceError(sourceName, contractName);
    }

    const unprefixedAddress = getUnprefixedHexString(address);

    for (const { start, length } of contractLinkReferences) {
      linkedBytecode =
        linkedBytecode.substring(0, 2 + start * 2) +
        unprefixedAddress +
        linkedBytecode.substring(2 + (start + length) * 2);
    }
  }

  return getPrefixedHexString(linkedBytecode);
}
