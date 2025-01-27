import { assertIgnitionInvariant } from "../../utils/assertions";

/**
 * Is the string a valid ethereum address?
 */
export function isAddress(address: any): address is string {
  const { isAddress: ethersIsAddress } =
    require("ethers") as typeof import("ethers");

  return ethersIsAddress(address);
}

/**
 * Returns a normalized and checksumed address for the given address.
 *
 * @param address - the address to reformat
 * @returns checksumed address
 */
export function toChecksumFormat(address: string): string {
  assertIgnitionInvariant(
    isAddress(address),
    `Expected ${address} to be an address`
  );

  const { getAddress } = require("ethers") as typeof import("ethers");

  return getAddress(address);
}

/**
 * Determine if two addresses are equal ignoring case (which is a consideration
 * because of checksumming).
 */
export function equalAddresses(
  leftAddress: string,
  rightAddress: string
): boolean {
  return toChecksumFormat(leftAddress) === toChecksumFormat(rightAddress);
}
