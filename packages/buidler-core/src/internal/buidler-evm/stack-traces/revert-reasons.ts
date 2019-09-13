import { rawDecode } from "ethereumjs-abi";

export function decodeRevertReason(returnData: Buffer): string {
  if (returnData.length === 0) {
    return "";
  }

  // TODO: What should happen if the reason fails to be decoded?

  const decoded = rawDecode(["string"], returnData.slice(4));
  return decoded.toString("utf8");
}
