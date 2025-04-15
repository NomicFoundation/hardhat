import assert from "node:assert/strict";

import { isAddress } from "@nomicfoundation/hardhat-utils/eth";

export function properAddress(address: string): void {
  assert.equal(isAddress(address), true, `Address "${address}" is not valid`);
}
