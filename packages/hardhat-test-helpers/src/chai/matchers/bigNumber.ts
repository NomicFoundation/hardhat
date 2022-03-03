import { BigNumber as BigNumberEthers } from "ethers";
import { BigNumber as BigNumberJs } from "bignumber.js";
import BN from "bn.js";

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

  Assertion.overwriteMethod("within", overrideWithin(utils));

  Assertion.overwriteMethod("closeTo", overrideCloseTo(utils));
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
  source: bigint | BigNumberEthers | BigNumberJs | BN | number | string
): bigint {
  if (source instanceof BigNumberEthers) {
    return BigInt(source.toString());
  } else if (source instanceof BN) {
    return BigInt(source.toString());
  } else if (source instanceof BigNumberJs) {
    return BigInt(source.toString(10));
  } else if (
    typeof source === "string" ||
    typeof source === "number" ||
    typeof source === "bigint"
  ) {
    return BigInt(source);
  } else {
    throw new Error(`cannot convert ${typeof source} to BigNumber`);
  }
}

function isBigNumber(source: any): boolean {
  return (
    typeof source === "bigint" ||
    BigNumberEthers.isBigNumber(source) ||
    BN.isBN(source) ||
    BigNumberJs.isBigNumber(source)
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
    if (
      chaiUtils.flag(this, "doLength") &&
      BigNumberEthers.isBigNumber(actualArg)
    ) {
      _super.apply(this, [actualArg.toNumber()]);
      return;
    }
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
    if (isBigNumber(expectedFlag) || isBigNumber(actualArg)) {
      const expected = normalize(expectedFlag);
      const actual = normalize(actualArg);
      this.assert(
        compare(functionName, expected, actual),
        `expected ${expected} to ${readableName} ${actual}`,
        `expected ${expected} to ${readableNegativeName} ${actual}`,
        expected,
        actual
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
        start <= expected && finish >= expected,
        `expected ${expected} to be within ${start}..${finish}`,
        `expected ${expected} to not be within ${start}..${finish}`,
        [start, finish],
        expected
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
        `expected ${expected} to be close to ${actual}`,
        `expected ${expected} not to be close to ${actual}`,
        `A number between ${actual - delta} and ${actual + delta}`,
        expected
      );
    } else {
      _super.apply(this, args);
    }
  };
}
