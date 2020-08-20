import { toBuffer } from "ethereumjs-util";

export const randomHash = () => randomHexString(64);
export const randomHashBuffer = () => toBuffer(randomHash());
export const randomAddress = () => randomHexString(40);
export const randomAddressBuffer = () => toBuffer(randomAddress());

const randomHexDigit = () => Math.floor(Math.random() * 16).toString(16);

const randomHexString = (length: number) =>
  `0x${new Array(length).fill(0).map(randomHexDigit).join("")}`;
