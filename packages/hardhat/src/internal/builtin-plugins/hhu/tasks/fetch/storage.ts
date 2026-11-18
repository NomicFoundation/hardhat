import type { NewUtilsTaskActionFunction } from "../../types.js";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import { numberToHexString } from "@nomicfoundation/hardhat-utils/hex";

import { parseAddressArgument } from "../address.js";
import { parseBlockArgument } from "../block.js";
import { requestHex } from "../connection.js";

interface FetchStorageActionArguments {
  address: string;
  slot: bigint;
  block: string;
}

const fetchStorageAction: NewUtilsTaskActionFunction<
  FetchStorageActionArguments
> = async ({ address, slot, block }, hre) => {
  if (slot < 0n || slot >= 2n ** 256n) {
    throw new HardhatError(HardhatError.ERRORS.CORE.ARGUMENTS.INVALID_VALUE, {
      value: slot,
      name: "slot",
      reason: "it must be between 0 and 2^256 - 1",
    });
  }

  const params = [
    await parseAddressArgument(address, "address"),
    numberToHexString(slot),
    parseBlockArgument(block, "block"),
  ];

  console.log(await requestHex(hre, "eth_getStorageAt", params));
};

export default fetchStorageAction;
