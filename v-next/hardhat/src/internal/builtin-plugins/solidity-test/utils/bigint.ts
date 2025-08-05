// TODO: Move the bigInt* functions to hardhat-utils if they're needed elsewhere

export function bigIntPadEnd(value: bigint, precision: number): bigint {
  return value * BigInt(Math.pow(10, precision));
}

export function bigIntDiv(
  value: bigint,
  previousValue: bigint,
  precision: number,
): bigint {
  return bigIntPadEnd(value, precision) / previousValue;
}

export function bigIntAbs(value: bigint): bigint {
  return value < 0 ? -value : value;
}

export function bigIntFromNumber(value: number, precision: number): bigint {
  return BigInt(Math.round(value * Math.pow(10, precision)));
}

export function bigIntToString(
  value: bigint,
  precision: number,
  signed: boolean = true,
): string {
  let str = bigIntAbs(value)
    .toString()
    .padStart(precision + 1, "0");
  if (value < 0n) {
    str = `-${str}`;
  } else if (signed) {
    str = `+${str}`;
  }
  return `${str.slice(0, str.length - precision)}.${str.slice(str.length - precision)}`;
}
