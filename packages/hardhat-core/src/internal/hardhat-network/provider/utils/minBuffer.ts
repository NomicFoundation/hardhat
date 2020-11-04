import { BN, toBuffer } from "ethereumjs-util";

export function minBuffer(left: Buffer | BN, right: Buffer | BN): Buffer {
  const min = BN.min(toBN(left), toBN(right));
  return toBuffer(min);
}

function toBN(value: Buffer | BN) {
  return value instanceof BN ? value : new BN(value);
}
