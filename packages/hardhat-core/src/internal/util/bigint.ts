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

function mapNumberToBigint<T>(x: number | T): bigint | T {
  if (typeof x === "number") {
    return BigInt(x);
  }

  return x;
}

export const BigIntUtils = {
  min,
  max,
  isBigInt,
  divUp,
  cmp,
  mapNumberToBigint,
};
