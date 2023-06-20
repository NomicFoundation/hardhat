export function toHex(value: string | Buffer): string {
  const stringValue = typeof value === "string" ? value : value.toString("hex");
  return stringValue.startsWith("0x") ? stringValue : `0x${stringValue}`;
}
