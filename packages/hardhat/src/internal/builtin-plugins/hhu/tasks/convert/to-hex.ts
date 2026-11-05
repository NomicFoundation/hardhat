import type { NewUtilsTaskActionFunction } from "../../types.js";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import { numberToHexString } from "@nomicfoundation/hardhat-utils/hex";

interface ToHexActionArguments {
  value: bigint;
}

const toHexAction: NewUtilsTaskActionFunction<ToHexActionArguments> = async ({
  value,
}) => {
  if (value < 0n) {
    throw new HardhatError(HardhatError.ERRORS.CORE.ARGUMENTS.INVALID_VALUE, {
      value,
      name: "value",
      reason: "it must be a non-negative integer",
    });
  }

  console.log(numberToHexString(value));
};

export default toHexAction;
