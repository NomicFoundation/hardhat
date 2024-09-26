import { HardhatError } from "@ignored/hardhat-vnext-errors";
import { deepClone, isObject } from "@ignored/hardhat-vnext-utils/lang";

const PRIMITIVE = [
  "bigint",
  "boolean",
  "function",
  "number",
  "string",
  "symbol",
];

export async function deepCopy<T = any>(value: T): Promise<T> {
  // The function 'deepClone' from 'hardhat-utils' cannot be used to replace this function, it won't properly clone
  // the value.

  if (
    value === null ||
    value === undefined ||
    PRIMITIVE.includes(typeof value)
  ) {
    return value;
  }

  // Keep any Addressable
  if (
    isObject(value) &&
    "getAddress" in value &&
    typeof value.getAddress === "function"
  ) {
    return value;
  }

  if (Array.isArray(value)) {
    return deepClone(value);
  }

  if (isObject(value)) {
    const newV: any = {};

    return Object.keys(value).reduce((accum, key) => {
      accum[key] = value[key];
      return accum;
    }, newV);
  }

  throw new HardhatError(
    HardhatError.ERRORS.ETHERS.UNSUPPORTED_TYPE_FOR_DEEP_COPY,
    {
      value,
      type: typeof value,
    },
  );
}
