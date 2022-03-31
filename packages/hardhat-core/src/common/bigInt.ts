import type { BigNumber as EthersBigNumberType } from "ethers";
// eslint-disable-next-line import/no-extraneous-dependencies
import type { BigNumber as BigNumberJsType } from "bignumber.js";
// eslint-disable-next-line import/no-extraneous-dependencies
import type { default as BNType } from "bn.js";

export function normalizeToBigInt(
  source:
    | number
    | bigint
    | BNType
    | EthersBigNumberType
    | BigNumberJsType
    | string
): bigint {
  if (isBigNumber(source)) {
    return BigInt(source.toString());
  } else if (
    typeof source === "string" ||
    typeof source === "number" ||
    typeof source === "bigint"
  ) {
    // first construct a BigInt, to allow it to throw if there's a fractional value:
    const toReturn = BigInt(source);
    // then check the source for integer safety:
    if (typeof source === "number" && !Number.isSafeInteger(source)) {
      // eslint-disable-next-line @nomiclabs/hardhat-internal-rules/only-hardhat-error
      throw new RangeError(
        `Cannot convert unsafe integer ${source} to BigInt. Consider using BigInt(${source}) instead. For more details, see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/isSafeInteger`
      );
    }
    // haven't thrown; return the value:
    return toReturn;
  } else {
    // eslint-disable-next-line @nomiclabs/hardhat-internal-rules/only-hardhat-error
    throw new Error(`cannot convert ${typeof source} to BigInt`);
  }
}

export function isBigNumber(source: any): boolean {
  return (
    typeof source === "bigint" ||
    isEthersBigNumber(source) ||
    isBN(source) ||
    isBigNumberJsBigNumber(source)
  );
}

function isBN(n: any) {
  try {
    // eslint-disable-next-line import/no-extraneous-dependencies
    const BN: typeof BNType = require("bn.js");
    return BN.isBN(n);
  } catch (e) {
    return false;
  }
}

function isEthersBigNumber(n: any) {
  try {
    // eslint-disable-next-line import/no-extraneous-dependencies
    const BigNumber: typeof EthersBigNumberType =
      require("ethers").ethers.BigNumber;
    return BigNumber.isBigNumber(n);
  } catch (e) {
    return false;
  }
}

function isBigNumberJsBigNumber(n: any) {
  try {
    // eslint-disable-next-line import/no-extraneous-dependencies
    const BigNumber: typeof BigNumberJsType = require("bignumber.js").BigNumber;
    return BigNumber.isBigNumber(n);
  } catch (e) {
    return false;
  }
}

export function formatNumberType(
  n: string | bigint | BNType | EthersBigNumberType | BigNumberJsType
): string {
  if (typeof n === "object") {
    if (isBN(n)) {
      return "BN";
    } else if (isEthersBigNumber(n)) {
      return "ethers.BigNumber";
    } else if (isBigNumberJsBigNumber(n)) {
      return "bignumber.js";
    }
  }
  return typeof n;
}
