import type { NewUtilsTaskActionFunction } from "../../types.js";

import { bytesToHexString } from "@nomicfoundation/hardhat-utils/hex";

import { hashSignature } from "./signature.js";

interface SigEventActionArguments {
  signature: string;
}

const sigEventAction: NewUtilsTaskActionFunction<
  SigEventActionArguments
> = async ({ signature }) => {
  console.log(bytesToHexString(await hashSignature(signature)));
};

export default sigEventAction;
