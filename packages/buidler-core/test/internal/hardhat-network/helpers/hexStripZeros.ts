import { addHexPrefix, stripZeros } from "ethereumjs-util";

export function hexStripZeros(hexString: string) {
  return addHexPrefix(stripZeros(hexString));
}
