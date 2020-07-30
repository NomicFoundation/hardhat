export const randomHash = () => randomHexString(64);
export const randomAddress = () => randomHexString(40);
export const randomAddressBuffer = () => Buffer.from(randomAddress(), "hex");

const randomHexDigit = () => Math.floor(Math.random() * 16).toString(16);

const randomHexString = (length: number) =>
  new Array(length).fill(0).map(randomHexDigit).join("");
