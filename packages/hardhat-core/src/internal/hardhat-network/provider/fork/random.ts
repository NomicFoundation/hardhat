import { bufferToHex, keccak256 } from "ethereumjs-util";

export const randomHash = () => bufferToHex(randomHashBuffer());

let next: Buffer | undefined;
export const randomHashBuffer = () => {
  if (next === undefined) {
    next = keccak256("seed");
  }

  const result = next;
  next = keccak256(next);

  return result;
};

export const randomAddress = () => bufferToHex(randomAddressBuffer());

export const randomAddressBuffer = () => randomHashBuffer().slice(0, 20);
