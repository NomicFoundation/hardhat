import { BN } from "ethereumjs-util";

export function getCurrentTimestamp(): number {
  return Math.ceil(new Date().getTime() / 1000);
}

export function BNtoHex(bn: BN): string {
  return `0x${bn.toString(16)}`;
}
