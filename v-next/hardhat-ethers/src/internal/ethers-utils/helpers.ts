import type { FormatFunc } from "./types.js";

import { assertHardhatInvariant } from "@ignored/hardhat-vnext-errors";
import { assert, assertArgument, isHexString } from "ethers";

export function object(
  format: Record<string, FormatFunc>,
  altNames?: Record<string, string[]>,
): FormatFunc {
  return (value: any) => {
    const result: any = {};

    Object.keys(format).forEach((key) => {
      let srcKey = key;

      if (altNames !== undefined && key in altNames && !(srcKey in value)) {
        for (const altKey of altNames[key]) {
          if (altKey in value) {
            srcKey = altKey;
            break;
          }
        }
      }

      try {
        const nv = format[key](value[srcKey]);
        if (nv !== undefined) {
          result[key] = nv;
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "not-an-error";
        assert(
          false,
          `invalid value for value.${key} (${message})`,
          "BAD_DATA",
          { value },
        );
      }
    });

    return result;
  };
}

export function allowNull(format: FormatFunc, nullValue?: any): FormatFunc {
  return function (value: any) {
    if (value === null || value === undefined) {
      return nullValue;
    }
    return format(value);
  };
}

export function formatBoolean(value: any): boolean {
  switch (value) {
    case true:
    case "true":
      return true;
    case false:
    case "false":
      return false;
    default:
      assertArgument(
        false,
        `invalid boolean; ${JSON.stringify(value)}`,
        "value",
        value,
      );
  }
}

export function arrayOf(format: FormatFunc): FormatFunc {
  return (array: any) => {
    assertHardhatInvariant(Array.isArray(array), "not an array");
    return array.map((i) => format(i));
  };
}

export function formatHash(value: any): string {
  assertArgument(isHexString(value, 32), "invalid hash", "value", value);
  return value;
}

export function formatData(value: string): string {
  assertArgument(isHexString(value, true), "invalid data", "value", value);
  return value;
}
