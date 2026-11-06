import type { NewUtilsTaskActionFunction } from "../../types.js";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import {
  getAbiEventTopic,
  parseAbiEventSignature,
} from "@nomicfoundation/hardhat-utils/abi";

import { parseSignatureArgument } from "./arguments.js";

interface SigEventActionArguments {
  signature: string;
}

const sigEventAction: NewUtilsTaskActionFunction<
  SigEventActionArguments
> = async ({ signature }) => {
  const parsed = parseSignatureArgument(
    parseAbiEventSignature,
    signature,
    "signature",
  );

  if (parsed.anonymous) {
    throw new HardhatError(HardhatError.ERRORS.CORE.ARGUMENTS.INVALID_VALUE, {
      value: signature,
      name: "signature",
      reason: "anonymous events have no topic",
    });
  }

  console.log(await getAbiEventTopic(parsed));
};

export default sigEventAction;
