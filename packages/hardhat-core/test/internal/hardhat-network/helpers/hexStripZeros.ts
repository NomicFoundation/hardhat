import { addHexPrefix, unpadHexString } from "@ignored/util";

export function hexStripZeros(hexString: string) {
  return addHexPrefix(unpadHexString(hexString));
}
