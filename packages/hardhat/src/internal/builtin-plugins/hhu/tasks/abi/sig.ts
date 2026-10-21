import type { NewUtilsTaskActionFunction } from "../../types.js";

import { bytesToHexString } from "@nomicfoundation/hardhat-utils/hex";

import { hashSignature } from "./signature.js";

interface SigActionArguments {
  signature: string;
}

const sigAction: NewUtilsTaskActionFunction<SigActionArguments> = async ({
  signature,
}) => {
  const hash = await hashSignature(signature);

  console.log(bytesToHexString(hash.subarray(0, 4)));
};

export default sigAction;
