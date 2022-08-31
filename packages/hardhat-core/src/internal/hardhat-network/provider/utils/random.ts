import type EthereumjsUtilT from "@ethereumjs/util";
import type EthereumCryptographyKeccakT from "ethereum-cryptography/keccak";

export class RandomBufferGenerator {
  private constructor(private _nextValue: Uint8Array) {}

  public static create(seed: string): RandomBufferGenerator {
    const { bufArrToArr } =
      require("@ethereumjs/util") as typeof EthereumjsUtilT;
    const { keccak256 } =
      require("ethereum-cryptography/keccak") as typeof EthereumCryptographyKeccakT;

    const nextValue = keccak256(bufArrToArr(Buffer.from(seed)));

    return new RandomBufferGenerator(nextValue);
  }

  public next(): Buffer {
    const { arrToBufArr } =
      require("@ethereumjs/util") as typeof EthereumjsUtilT;
    const { keccak256 } =
      require("ethereum-cryptography/keccak") as typeof EthereumCryptographyKeccakT;

    const valueToReturn = this._nextValue;

    this._nextValue = keccak256(this._nextValue);

    return arrToBufArr(valueToReturn);
  }

  public clone(): RandomBufferGenerator {
    return new RandomBufferGenerator(this._nextValue);
  }
}

export const randomHash = () => {
  const { bufferToHex } = require("@ethereumjs/util") as typeof EthereumjsUtilT;
  return bufferToHex(randomHashBuffer());
};

const generator = RandomBufferGenerator.create("seed");
export const randomHashBuffer = (): Buffer => {
  return generator.next();
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
