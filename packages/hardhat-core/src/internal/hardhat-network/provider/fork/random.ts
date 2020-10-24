import type EthereumjsUtilT from "ethereumjs-util";

export const randomHash = () => {
  const { bufferToHex } = require("ethereumjs-util") as typeof EthereumjsUtilT;
  return bufferToHex(randomHashBuffer());
};

let next: Buffer | undefined;
export const randomHashBuffer = () => {
  const { keccak256 } = require("ethereumjs-util") as typeof EthereumjsUtilT;

  if (next === undefined) {
    next = keccak256("seed");
  }

  const result = next;
  next = keccak256(next);

  return result;
};

export const randomAddress = () => {
  const { bufferToHex } = require("ethereumjs-util") as typeof EthereumjsUtilT;
  return bufferToHex(randomAddressBuffer());
};

export const randomAddressBuffer = () => randomHashBuffer().slice(0, 20);
