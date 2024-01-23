import {
  addHexPrefix,
  unpadBytes,
  toBytes,
  bytesToHex,
} from "@nomicfoundation/ethereumjs-util";

export function hexStripZeros(hexString: string) {
  return addHexPrefix(bytesToHex(unpadBytes(toBytes(hexString))));
}
