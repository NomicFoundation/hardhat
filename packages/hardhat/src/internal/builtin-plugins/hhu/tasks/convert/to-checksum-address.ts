import type { NewUtilsTaskActionFunction } from "../../types.js";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import {
  isAddress,
  toChecksumAddress,
} from "@nomicfoundation/hardhat-utils/eth";

interface ToChecksumAddressActionArguments {
  address: string;
}

const toChecksumAddressAction: NewUtilsTaskActionFunction<
  ToChecksumAddressActionArguments
> = async ({ address }) => {
  if (!isAddress(address)) {
    throw new HardhatError(HardhatError.ERRORS.CORE.ARGUMENTS.INVALID_VALUE, {
      value: address,
      name: "address",
      reason: "it must be a valid Ethereum address",
    });
  }

  console.log(await toChecksumAddress(address));
};

export default toChecksumAddressAction;
