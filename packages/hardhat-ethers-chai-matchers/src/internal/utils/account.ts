import type { Addressable } from "ethers/address";

import { isAddress } from "@nomicfoundation/hardhat-utils/eth";
import { assert as chaiAssert } from "chai";
import { isAddressable } from "ethers/address";

export async function getAddressOf(
  account: Addressable | string,
): Promise<string> {
  if (isAddress(account)) {
    return account;
  }

  if (isAddressable(account)) {
    return account.getAddress();
  }

  chaiAssert.fail(`Expected string or addressable, but got "${account}"`);
}
