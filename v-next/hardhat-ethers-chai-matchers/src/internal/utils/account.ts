import type { Addressable } from "ethers/address";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import { isAddress } from "@nomicfoundation/hardhat-utils/eth";
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

  throw new HardhatError(
    HardhatError.ERRORS.CHAI_MATCHERS.EXPECTED_STRING_OR_ADDRESSABLE,
    {
      account,
    },
  );
}
