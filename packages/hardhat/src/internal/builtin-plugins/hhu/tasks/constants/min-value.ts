import type { NewUtilsTaskActionFunction } from "../../types.js";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import {
  getIntTypeRange,
  parseIntType,
} from "@nomicfoundation/hardhat-utils/abi";

interface MinValueActionArguments {
  type: string;
}

const minValueAction: NewUtilsTaskActionFunction<
  MinValueActionArguments
> = async ({ type }) => {
  const intType = parseIntType(type);

  if (intType === undefined) {
    throw new HardhatError(HardhatError.ERRORS.CORE.ARGUMENTS.INVALID_VALUE, {
      value: type,
      name: "type",
      reason: "it must be a Solidity integer type, like uint256 or int128",
    });
  }

  console.log(getIntTypeRange(intType).min.toString());
};

export default minValueAction;
