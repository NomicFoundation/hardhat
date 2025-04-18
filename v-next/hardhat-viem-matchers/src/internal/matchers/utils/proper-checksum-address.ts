import assert from "node:assert/strict";

import { isValidChecksumAddress } from "@nomicfoundation/hardhat-utils/eth";

import { properAddress } from "./proper-address.js";

export async function properChecksumAddress(address: string): Promise<void> {
  properAddress(address);

  assert.equal(
    await isValidChecksumAddress(address),
    true,
    `The address "${address}" has the correct format, but its checksum is incorrect`,
  );
}
