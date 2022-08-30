import { addHexPrefix, unpadHexString } from "@nomicfoundation/util";

export function hexStripZeros(hexString: string) {
  return addHexPrefix(unpadHexString(hexString));
}
