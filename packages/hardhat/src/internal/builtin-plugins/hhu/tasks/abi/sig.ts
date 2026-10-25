import type { NewUtilsTaskActionFunction } from "../../types.js";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import {
  getAbiSelector,
  parseAbiSignature,
} from "@nomicfoundation/hardhat-utils/abi";

import { parseSignatureArgument } from "./arguments.js";

interface SigActionArguments {
  signature: string;
}

const sigAction: NewUtilsTaskActionFunction<SigActionArguments> = async ({
  signature,
}) => {
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

  console.log(await getAbiSelector(parsed));
};

export default sigAction;
