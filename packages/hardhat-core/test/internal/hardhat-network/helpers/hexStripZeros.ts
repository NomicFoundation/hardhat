export function hexStripZeros(hexString: string) {
  return hexString === "0x0" ? "0x0" : hexString.replace(/^0x0+/, "0x");
}
