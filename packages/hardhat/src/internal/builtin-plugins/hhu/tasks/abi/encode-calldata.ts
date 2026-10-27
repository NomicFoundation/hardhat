import type { NewUtilsTaskActionFunction } from "../../types.js";

import {
  getAbiSelector,
  parseAbiFunctionSignature,
} from "@nomicfoundation/hardhat-utils/abi";
import { getUnprefixedHexString } from "@nomicfoundation/hardhat-utils/hex";

import { parseSignatureArgument } from "./arguments.js";
import { encodeArguments } from "./encode.js";

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

  const selector = await getAbiSelector(parsed);
  const encoded = await encodeArguments(parsed.inputs, values, "values");

  console.log(selector + getUnprefixedHexString(encoded));
};

export default encodeCalldataAction;
