export function isRpcQuantityString(u: unknown): u is string {
  return (
    typeof u === "string" &&
    u.match(/^0x(?:0|(?:[1-9a-fA-F][0-9a-fA-F]*))$/) !== null
  );
}

export function isRpcDataString(u: unknown): u is string {
  return typeof u === "string" && u.match(/^0x(?:[0-9a-fA-F]{2})*$/) !== null;
}

export function isBigInt(x: unknown): x is bigint {
  return typeof x === "bigint";
}
