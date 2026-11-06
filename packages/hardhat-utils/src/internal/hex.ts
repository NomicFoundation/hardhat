import {
  getPrefixedHexString,
  getUnprefixedHexString,
  isPrefixedHexString,
} from "../hex.js";

export function padToEven(value: string): string {
  const isPrefixed = isPrefixedHexString(value);
  const unprefixed = getUnprefixedHexString(value);

  const padded = unprefixed.length % 2 === 0 ? unprefixed : `0${unprefixed}`;

  return isPrefixed ? getPrefixedHexString(padded) : padded;
}
