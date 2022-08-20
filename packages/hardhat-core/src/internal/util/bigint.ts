import {
  BigIntLike,
  bufferToBigInt,
  bufferToHex,
  toBuffer,
} from "@ethereumjs/util";

function min(x: bigint, y: bigint): bigint {
  return x < y ? x : y;
}

function max(x: bigint, y: bigint): bigint {
  return x > y ? x : y;
}

function isBigInt(x: unknown): x is bigint {
  return typeof x === "bigint";
}

function divUp(x: bigint, y: bigint): bigint {
  let result = x / y;

  if (x % y !== 0n) {
    result = result + 1n;
  }

  return result;
}

function cmp(a: bigint, b: bigint): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

function mapNumberToBigInt<T>(x: number | T): bigint | T {
  if (typeof x === "number") {
    return BigInt(x);
  }

  return x;
}

function mapBigIntToNumber<T>(x: bigint | T): number | T {
  if (typeof x === "bigint") {
    return Number(x);
  }

  return x;
}

function toWord(x: bigint | number): string {
  return x.toString(16).padStart(64, "0");
}

function fromBigIntLike(x: BigIntLike | undefined): bigint | undefined {
  if (x === undefined || typeof x === "bigint") {
    return x;
  }
  if (typeof x === "number" || typeof x === "string") {
    return BigInt(x);
  }
  if (Buffer.isBuffer(x)) {
    return bufferToBigInt(x);
  }

  const exhaustiveCheck: never = x;
  return exhaustiveCheck;
}

function toHex(x: number | bigint): string {
  return bufferToHex(toBuffer(x));
}

export const BigIntUtils = {
  min,
  max,
  isBigInt,
  divUp,
  cmp,
  mapNumberToBigInt,
  mapBigIntToNumber,
  toWord,
  fromBigIntLike,
  toHex,
};
