import type { NewUtilsTaskActionFunction } from "../../types.js";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import {
  getUnprefixedHexString,
  hexStringToBigInt,
  isHexString,
} from "@nomicfoundation/hardhat-utils/hex";

interface FromHexActionArguments {
  value: string;
}

const fromHexAction: NewUtilsTaskActionFunction<
  FromHexActionArguments
> = async ({ value }) => {
  if (!isHexString(value)) {
    throw new HardhatError(
      HardhatError.ERRORS.CORE.GENERAL.INVALID_HEX_STRING,
      { value },
    );
  }

  if (getUnprefixedHexString(value).length === 0) {
    throw new HardhatError(HardhatError.ERRORS.CORE.ARGUMENTS.INVALID_VALUE, {
      value,
      name: "value",
      reason: "it must have at least one hex digit",
    });
  }

  console.log(hexStringToBigInt(value).toString());
};

export default fromHexAction;
