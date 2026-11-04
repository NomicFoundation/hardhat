import type { NewUtilsTaskActionFunction } from "../../types.js";

import { parseAbiSignature } from "@nomicfoundation/hardhat-utils/abi";

import { parseSignatureArgument } from "./arguments.js";
import { encodeArguments } from "./encode.js";

interface EncodeArgsActionArguments {
  signature: string;
  values: string[];
}

const encodeArgsAction: NewUtilsTaskActionFunction<
  EncodeArgsActionArguments
> = async ({ signature, values }) => {
  const { inputs } = parseSignatureArgument(
    parseAbiSignature,
    signature,
    "signature",
  );

  console.log(await encodeArguments(inputs, values, "values"));
};

export default encodeArgsAction;
