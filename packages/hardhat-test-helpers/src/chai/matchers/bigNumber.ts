// TODO: consider adding support for the following Chai.Assert properties.
// Might any of these come "for free" due to supporting other methods? At the
// very least get them tested.
//   isAbove
//   isAtLeast
//   isBelow
//   isAtMost
//   isAt
//   isNumber
//   isNotNumber
//   closeTo
//   approximately

import type { BigNumber as EthersBigNumberType } from "ethers";
// eslint-disable-next-line import/no-extraneous-dependencies
import type { BigNumber as BigNumberJsType } from "bignumber.js";
// eslint-disable-next-line import/no-extraneous-dependencies
import type { default as BNType } from "bn.js";

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
    return n instanceof BigNumber && BigNumber.isBigNumber(n);
  } catch (e) {
    return false;
  }
}

export function supportBigNumber(
  Assertion: Chai.AssertionStatic,
  utils: Chai.ChaiUtils
) {
  const equalsFunction = override("eq", "equal", "not equal", utils);
  Assertion.overwriteMethod("equals", equalsFunction);
  Assertion.overwriteMethod("equal", equalsFunction);
  Assertion.overwriteMethod("eq", equalsFunction);

  const gtFunction = override("gt", "be above", "be at most", utils);
  Assertion.overwriteMethod("above", gtFunction);
  Assertion.overwriteMethod("gt", gtFunction);
  Assertion.overwriteMethod("greaterThan", gtFunction);

  const ltFunction = override("lt", "be below", "be at least", utils);
  Assertion.overwriteMethod("below", ltFunction);
  Assertion.overwriteMethod("lt", ltFunction);
  Assertion.overwriteMethod("lessThan", ltFunction);

  const gteFunction = override("gte", "be at least", "be below", utils);
  Assertion.overwriteMethod("least", gteFunction);
  Assertion.overwriteMethod("gte", gteFunction);
  Assertion.overwriteMethod("greaterThanOrEqual", gteFunction);

  const lteFunction = override("lte", "be at most", "be above", utils);
  Assertion.overwriteMethod("most", lteFunction);
  Assertion.overwriteMethod("lte", lteFunction);
  Assertion.overwriteMethod("lessThanOrEqual", lteFunction);

  Assertion.overwriteChainableMethod(...createLengthOverride("length"));
  Assertion.overwriteChainableMethod(...createLengthOverride("lengthOf"));

  Assertion.overwriteMethod("within", overrideWithin(utils));

  Assertion.overwriteMethod("closeTo", overrideCloseTo(utils));
}

function createLengthOverride(
  method: string
): [string, (...args: any[]) => any, (...args: any[]) => any] {
  return [
    method,
    function (_super: any) {
      return function (this: Chai.AssertionPrototype, value: any) {
        const actual = this._obj;
        if (isBigNumber(value)) {
          const sizeOrLength =
            actual instanceof Map || actual instanceof Set ? "size" : "length";
          const actualLength = normalize(actual[sizeOrLength]);
          const expectedLength = normalize(value);
          this.assert(
            actualLength === expectedLength,
            `expected #{this} to have a ${sizeOrLength} of ${expectedLength.toString()} but got ${actualLength.toString()}`,
            `expected #{this} not to have a ${sizeOrLength} of ${expectedLength.toString()} but got ${actualLength.toString()}`,
            actualLength.toString(),
            expectedLength.toString()
          );
        } else {
          _super.apply(this, arguments);
        }
      };
    },
    function (_super: any) {
      return function (this: any) {
        _super.apply(this, arguments);
      };
    } as any,
  ];
}

type Methods = "eq" | "gt" | "lt" | "gte" | "lte";

function override(
  method: Methods,
  name: string,
  negativeName: string,
  utils: Chai.ChaiUtils
) {
  return (_super: (...args: any[]) => any) =>
    overwriteBigNumberFunction(method, name, negativeName, _super, utils);
}

function normalize(
  source:
    | number
    | bigint
    | BNType
    | EthersBigNumberType
    | BigNumberJsType
    | string
): bigint {
  if (
    isEthersBigNumber(source) ||
    isBN(source) ||
    isBigNumberJsBigNumber(source)
  ) {
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
      throw new RangeError(
        `Cannot compare to unsafe integer ${source}. Consider using BigInt(${source}) instead. For more details, see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/isSafeInteger`
      );
    }
    // haven't thrown; return the value:
    return toReturn;
  } else {
    throw new Error(`cannot convert ${typeof source} to BigInt`);
  }
}

function isBigNumber(source: any): boolean {
  return (
    typeof source === "bigint" ||
    isEthersBigNumber(source) ||
    isBN(source) ||
    isBigNumberJsBigNumber(source)
  );
}

function overwriteBigNumberFunction(
  functionName: Methods,
  readableName: string,
  readableNegativeName: string,
  _super: (...args: any[]) => any,
  chaiUtils: Chai.ChaiUtils
) {
  return function (this: Chai.AssertionStatic, ...args: any[]) {
    const [actualArg] = args;
    const expectedFlag = chaiUtils.flag(this, "object");
    function compare(method: Methods, lhs: bigint, rhs: bigint): boolean {
      if (method === "eq") {
        return lhs === rhs;
      } else if (method === "gt") {
        return lhs > rhs;
      } else if (method === "lt") {
        return lhs < rhs;
      } else if (method === "gte") {
        return lhs >= rhs;
      } else if (method === "lte") {
        return lhs <= rhs;
      } else {
        throw new Error(`Unknown comparison operation ${method}`);
      }
    }
    if (chaiUtils.flag(this, "doLength") && isBigNumber(actualArg)) {
      const sizeOrLength =
        expectedFlag instanceof Map || expectedFlag instanceof Set
          ? "size"
          : "length";
      if (expectedFlag[sizeOrLength] === undefined) {
        _super.apply(this, args);
        return;
      }
      const expected = normalize(expectedFlag[sizeOrLength]);
      const actual = normalize(actualArg);
      this.assert(
        compare(functionName, expected, actual),
        `expected #{this} to have a ${sizeOrLength} ${readableName.replace(
          "be ",
          ""
        )} ${actual.toString()} but got ${expected}`,
        `expected #{this} to have a ${sizeOrLength} ${readableNegativeName} ${actual.toString()}`,
        expected,
        actual
      );
    } else if (isBigNumber(expectedFlag) || isBigNumber(actualArg)) {
      const expected = normalize(expectedFlag);
      const actual = normalize(actualArg);
      this.assert(
        compare(functionName, expected, actual),
        `expected ${expected} to ${readableName} ${actual}`,
        `expected ${expected} to ${readableNegativeName} ${actual}`,
        actual,
        expected
      );
    } else {
      _super.apply(this, args);
    }
  };
}

function overrideWithin(utils: Chai.ChaiUtils) {
  return (_super: (...args: any[]) => any) =>
    overwriteBigNumberWithin(_super, utils);
}

function overwriteBigNumberWithin(
  _super: (...args: any[]) => any,
  chaiUtils: Chai.ChaiUtils
) {
  return function (this: Chai.AssertionStatic, ...args: any[]) {
    const [startArg, finishArg] = args;
    const expectedFlag = chaiUtils.flag(this, "object");
    if (
      isBigNumber(expectedFlag) ||
      isBigNumber(startArg) ||
      isBigNumber(finishArg)
    ) {
      const expected = normalize(expectedFlag);
      const start = normalize(startArg);
      const finish = normalize(finishArg);
      this.assert(
        start <= expected && expected <= finish,
        `expected ${expected} to be within ${start}..${finish}`,
        `expected ${expected} to not be within ${start}..${finish}`,
        expected,
        [start, finish]
      );
    } else {
      _super.apply(this, args);
    }
  };
}

function overrideCloseTo(utils: Chai.ChaiUtils) {
  return (_super: (...args: any[]) => any) =>
    overwriteBigNumberCloseTo(_super, utils);
}

function overwriteBigNumberCloseTo(
  _super: (...args: any[]) => any,
  chaiUtils: Chai.ChaiUtils
) {
  return function (this: Chai.AssertionStatic, ...args: any[]) {
    const [actualArg, deltaArg] = args;
    const expectedFlag = chaiUtils.flag(this, "object");
    if (
      isBigNumber(expectedFlag) ||
      isBigNumber(actualArg) ||
      isBigNumber(deltaArg)
    ) {
      const expected = normalize(expectedFlag);
      const actual = normalize(actualArg);
      const delta = normalize(deltaArg);
      function abs(i: bigint): bigint {
        return i < 0 ? BigInt(-1) * i : i;
      }
      this.assert(
        abs(expected - actual) <= delta,
        `expected ${expected} to be close to ${actual} +/- ${delta}`,
        `expected ${expected} not to be close to ${actual} +/- ${delta}`,
        expected,
        `A number between ${actual - delta} and ${actual + delta}`
      );
    } else {
      _super.apply(this, args);
    }
  };
}
