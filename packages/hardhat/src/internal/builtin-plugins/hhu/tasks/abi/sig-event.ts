import type { NewUtilsTaskActionFunction } from "../../types.js";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import {
  getAbiEventTopic,
  parseAbiSignature,
} from "@nomicfoundation/hardhat-utils/abi";

import { parseSignatureArgument } from "./arguments.js";

interface SigEventActionArguments {
  signature: string;
}

const sigEventAction: NewUtilsTaskActionFunction<
  SigEventActionArguments
> = async ({ signature }) => {
  const parsed = parseSignatureArgument(
    parseAbiSignature,
    signature,
    "signature",
  );

  if (parsed.name === "") {
    throw new HardhatError(HardhatError.ERRORS.CORE.ARGUMENTS.INVALID_VALUE, {
      value: signature,
      name: "signature",
      reason: "it must include a name",
    });
  }

  console.log(await getAbiEventTopic(parsed));
};

export default sigEventAction;
