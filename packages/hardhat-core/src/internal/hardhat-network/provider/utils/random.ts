import type EthereumjsUtilT from "@nomicfoundation/ethereumjs-util";
import type * as UtilKeccakT from "../../../util/keccak";

export class RandomBufferGenerator {
  private constructor(private _nextValue: Buffer) {}

  public static create(seed: string): RandomBufferGenerator {
    const { keccak256 } = require("../../../util/keccak") as typeof UtilKeccakT;

    const nextValue = keccak256(Buffer.from(seed));

    return new RandomBufferGenerator(nextValue);
  }

  public next(): Buffer {
    const { keccak256 } = require("../../../util/keccak") as typeof UtilKeccakT;

    const valueToReturn = this._nextValue;

    this._nextValue = keccak256(this._nextValue);

    return valueToReturn;
  }

  public setNext(nextValue: Buffer) {
    this._nextValue = Buffer.from(nextValue);
  }

  public clone(): RandomBufferGenerator {
    return new RandomBufferGenerator(this._nextValue);
  }
}

export const randomHash = () => {
  const { bufferToHex } =
    require("@nomicfoundation/ethereumjs-util") as typeof EthereumjsUtilT;
  return bufferToHex(randomHashBuffer());
};

const generator = RandomBufferGenerator.create("seed");
export const randomHashBuffer = (): Buffer => {
  return generator.next();
};

export const randomAddress = () => {
  const { Address } =
    require("@nomicfoundation/ethereumjs-util") as typeof EthereumjsUtilT;
  return new Address(randomAddressBuffer());
};

export const randomAddressString = () => {
  const { bufferToHex } =
    require("@nomicfoundation/ethereumjs-util") as typeof EthereumjsUtilT;
  return bufferToHex(randomAddressBuffer());
};

export const randomAddressBuffer = () => randomHashBuffer().slice(0, 20);
