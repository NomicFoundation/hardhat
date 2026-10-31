import type { NewUtilsTaskActionFunction } from "../../types.js";

import {
  getAbiSelector,
  parseAbiFunctionSignature,
} from "@nomicfoundation/hardhat-utils/abi";

import { parseSignatureArgument } from "./arguments.js";

interface SigActionArguments {
  signature: string;
}

const sigAction: NewUtilsTaskActionFunction<SigActionArguments> = async ({
  signature,
}) => {
  const parsed = parseSignatureArgument(
    parseAbiFunctionSignature,
    signature,
    "signature",
  );

  console.log(await getAbiSelector(parsed));
};

export default sigAction;
