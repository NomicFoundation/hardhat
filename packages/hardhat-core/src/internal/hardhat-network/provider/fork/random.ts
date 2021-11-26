import type EthereumjsUtilT from "ethereumjs-util";

export const randomHash = () => {
  const { bufferToHex } = require("ethereumjs-util") as typeof EthereumjsUtilT;
  return bufferToHex(randomHashBuffer());
};

let next: Buffer | undefined;
export const randomHashBuffer = () => {
  const { keccakFromString, keccak256 } =
    require("ethereumjs-util") as typeof EthereumjsUtilT;

  if (next === undefined) {
    next = keccakFromString("seed");
  }

  const result = next;
  next = keccak256(next);

  return result;
};

export const randomAddress = () => {
  const { Address } = require("ethereumjs-util") as typeof EthereumjsUtilT;
  return new Address(randomAddressBuffer());
};

export const randomAddressString = () => {
  const { bufferToHex } = require("ethereumjs-util") as typeof EthereumjsUtilT;
  return bufferToHex(randomAddressBuffer());
};

export const randomAddressBuffer = () => randomHashBuffer().slice(0, 20);
