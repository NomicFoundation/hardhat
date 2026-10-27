import type { NewUtilsTaskActionFunction } from "../../types.js";

import { parseAbiParameter } from "@nomicfoundation/hardhat-utils/abi";

import { parseSignatureArgument } from "./arguments.js";
import { encodeArguments } from "./encode.js";

interface EncodeTypeActionArguments {
  type: string;
  value: string;
}

const encodeTypeAction: NewUtilsTaskActionFunction<
  EncodeTypeActionArguments
> = async ({ type, value }) => {
  const parameter = parseSignatureArgument(parseAbiParameter, type, "type");

  console.log(await encodeArguments([parameter], [value], "value"));
};

export default encodeTypeAction;
