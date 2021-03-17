import { addHexPrefix, unpadHexString } from "ethereumjs-util";

export function hexStripZeros(hexString: string) {
  return addHexPrefix(unpadHexString(hexString));
}
