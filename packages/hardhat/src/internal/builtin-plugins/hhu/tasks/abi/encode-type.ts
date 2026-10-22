import type { ParsedSignature } from "./signature.js";
import type { NewUtilsTaskActionFunction } from "../../types.js";

import { HardhatError } from "@nomicfoundation/hardhat-errors";

import { encodeArguments } from "./encode.js";
import { parseSignature } from "./signature.js";

interface EncodeTypeActionArguments {
  type: string;
  value: string;
}

const encodeTypeAction: NewUtilsTaskActionFunction<
  EncodeTypeActionArguments
> = async ({ type, value }) => {
  // A type is a one-parameter list, which the signature parser can read
  let inputs: ParsedSignature["inputs"];
  try {
    ({ inputs } = parseSignature(`(${type})`));
  } catch (error) {
    if (
      !HardhatError.isHardhatError(
        error,
        HardhatError.ERRORS.CORE.ARGUMENTS.INVALID_VALUE,
      )
    ) {
      throw error;
    }

    throw new HardhatError(
      HardhatError.ERRORS.CORE.ARGUMENTS.INVALID_VALUE,
      { value: type, name: "type", reason: error.messageArguments.reason },
      error,
    );
  }

  if (inputs.length !== 1) {
    throw new HardhatError(HardhatError.ERRORS.CORE.ARGUMENTS.INVALID_VALUE, {
      value: type,
      name: "type",
      reason: "it must be a single type, like uint256 or (address,bool)[]",
    });
  }

  console.log(await encodeArguments(inputs, [value], "value"));
};

export default encodeTypeAction;
