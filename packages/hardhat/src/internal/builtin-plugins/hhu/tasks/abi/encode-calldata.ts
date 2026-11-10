import type { NewUtilsTaskActionFunction } from "../../types.js";

import { parseAbiFunctionSignature } from "@nomicfoundation/hardhat-utils/abi";

import { parseSignatureArgument } from "./arguments.js";
import { encodeFunctionCall } from "./encode.js";

interface EncodeCalldataActionArguments {
  signature: string;
  values: string[];
}

const encodeCalldataAction: NewUtilsTaskActionFunction<
  EncodeCalldataActionArguments
> = async ({ signature, values }) => {
  const parsed = parseSignatureArgument(
    parseAbiFunctionSignature,
    signature,
    "signature",
  );

  console.log(await encodeFunctionCall(parsed, values, "values"));
};

export default encodeCalldataAction;
