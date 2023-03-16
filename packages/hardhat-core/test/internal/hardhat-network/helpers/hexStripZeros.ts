import { addHexPrefix, unpadHexString } from "@nomicfoundation/ethereumjs-util";

export function hexStripZeros(hexString: string) {
  return addHexPrefix(unpadHexString(hexString));
}
