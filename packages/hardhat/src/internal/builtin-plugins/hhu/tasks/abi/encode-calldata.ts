import type { NewUtilsTaskActionFunction } from "../../types.js";

import {
  bytesToHexString,
  getUnprefixedHexString,
} from "@nomicfoundation/hardhat-utils/hex";

import { encodeArguments } from "./encode.js";
import { hashSignature, parseSignature } from "./signature.js";

interface EncodeCalldataActionArguments {
  signature: string;
  values: string[];
}

const encodeCalldataAction: NewUtilsTaskActionFunction<
  EncodeCalldataActionArguments
> = async ({ signature, values }) => {
  // hashSignature also rejects a signature without a name
  const hash = await hashSignature(signature);
  const { inputs } = parseSignature(signature);

  const selector = bytesToHexString(hash.subarray(0, 4));
  const encoded = await encodeArguments(inputs, values, "values");

  console.log(selector + getUnprefixedHexString(encoded));
};

export default encodeCalldataAction;
