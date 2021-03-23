import { BN, bufferToHex, toBuffer } from "ethereumjs-util";

export function bnToHex(bn: BN): string {
  return bufferToHex(toBuffer(bn));
}
