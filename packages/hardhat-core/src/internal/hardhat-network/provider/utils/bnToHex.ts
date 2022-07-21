import { bufferToHex, toBuffer } from "ethereumjs-util";

// ETHJSTODO delete this file and move this to BigIntUtils
export function bnToHex(bn: any): string {
  return bufferToHex(toBuffer(bn));
}
