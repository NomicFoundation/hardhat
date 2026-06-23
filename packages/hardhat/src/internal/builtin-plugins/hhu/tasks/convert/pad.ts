import type { NewUtilsTaskActionFunction } from "../../types.js";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import {
  getUnprefixedHexString,
  isHexString,
} from "@nomicfoundation/hardhat-utils/hex";

interface PadActionArguments {
  value: string;
  length: number;
  left: boolean;
  right: boolean;
}

const padAction: NewUtilsTaskActionFunction<PadActionArguments> = async ({
  value,
  length,
  left,
  right,
}) => {
  if (left && right) {
    throw new HardhatError(
      HardhatError.ERRORS.CORE.ARGUMENTS.MUTUALLY_EXCLUSIVE_OPTIONS,
      { optionA: "left", optionB: "right" },
    );
  }

  if (length < 0) {
    throw new HardhatError(HardhatError.ERRORS.CORE.ARGUMENTS.INVALID_VALUE, {
      value: length,
      name: "length",
      reason: "it must be a non-negative integer",
    });
  }

  if (!isHexString(value)) {
    throw new HardhatError(
      HardhatError.ERRORS.CORE.GENERAL.INVALID_HEX_STRING,
      { value },
    );
  }

  const unprefixedHexString = getUnprefixedHexString(value);

  if (unprefixedHexString.length > length * 2) {
    throw new HardhatError(HardhatError.ERRORS.CORE.ARGUMENTS.INVALID_VALUE, {
      value,
      name: "value",
      reason: `it's longer than the target length of ${length} bytes`,
    });
  }

  const paddedHexString = right
    ? unprefixedHexString.padEnd(length * 2, "0")
    : unprefixedHexString.padStart(length * 2, "0");

  console.log(`0x${paddedHexString}`);
};

export default padAction;
