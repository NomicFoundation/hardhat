import type EthereumjsUtilT from "@ethereumjs/util";
import type EthereumCryptographyKeccakT from "ethereum-cryptography/keccak";

export const randomHash = () => {
  const { bufferToHex } = require("@ethereumjs/util") as typeof EthereumjsUtilT;
  return bufferToHex(randomHashBuffer());
};

let next: Uint8Array | undefined;
export const randomHashBuffer = (): Buffer => {
  const { arrToBufArr, bufArrToArr } =
    require("@ethereumjs/util") as typeof EthereumjsUtilT;
  const { keccak256 } =
    require("ethereum-cryptography/keccak") as typeof EthereumCryptographyKeccakT;

  if (next === undefined) {
    next = keccak256(bufArrToArr(Buffer.from("seed")));
  }

  const result = next;
  next = keccak256(next);

  return arrToBufArr(result);
};

export const randomAddress = () => {
  const { Address } = require("@ethereumjs/util") as typeof EthereumjsUtilT;
  return new Address(randomAddressBuffer());
};

export const randomAddressString = () => {
  const { bufferToHex } = require("@ethereumjs/util") as typeof EthereumjsUtilT;
  return bufferToHex(randomAddressBuffer());
};

export const randomAddressBuffer = () => randomHashBuffer().slice(0, 20);
