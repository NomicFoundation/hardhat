import { BigNumber as BigNumberEthers } from 'ethers';
import { BigNumber as BigNumberJs } from "bignumber.js";
import BN from "bn.js";

export function supportBigNumber(
  Assertion: Chai.AssertionStatic,
  utils: Chai.ChaiUtils
) {
  Assertion.overwriteMethod('equals', override('eq', 'equal', utils));
  Assertion.overwriteMethod('equal', override('eq', 'equal', utils));
  Assertion.overwriteMethod('eq', override('eq', 'equal', utils));

  Assertion.overwriteMethod('above', override('gt', 'above', utils));
  Assertion.overwriteMethod('gt', override('gt', 'greater than', utils));

  Assertion.overwriteMethod('below', override('lt', 'below', utils));
  Assertion.overwriteMethod('lt', override('lt', 'less than', utils));

  Assertion.overwriteMethod('least', override('gte', 'at least', utils));
  Assertion.overwriteMethod(
    'gte',
    override('gte', 'greater than or equal', utils)
  );

  Assertion.overwriteMethod('most', override('lte', 'at most', utils));
  Assertion.overwriteMethod(
    'lte',
    override('lte', 'less than or equal', utils)
  );

  Assertion.overwriteMethod('within', overrideWithin(utils));

  Assertion.overwriteMethod('closeTo', overrideCloseTo(utils));
}

type Methods = 'eq' | 'gt' | 'lt' | 'gte' | 'lte';

function override(method: Methods, name: string, utils: Chai.ChaiUtils) {
  return (_super: (...args: any[]) => any) =>
    overwriteBigNumberFunction(method, name, _super, utils);
}

function normalizeToBigInt(
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
    return BigInt(source)
  } else {
    throw new Error(`cannot convert ${typeof source} to BigNumber`);
  }
}

function isBigNumber(source: any): boolean {
  return typeof source === "bigint" ||
    BigNumberEthers.isBigNumber(source) ||
    BN.isBN(source) ||
    BigNumberJs.isBigNumber(source);
}

function overwriteBigNumberFunction(
  functionName: Methods,
  readableName: string,
  _super: (...args: any[]) => any,
  chaiUtils: Chai.ChaiUtils
) {
  return function (this: Chai.AssertionStatic, ...args: any[]) {
    const [actualArg] = args;
    const expectedFlag = chaiUtils.flag(this, 'object');
    if (chaiUtils.flag(this, 'doLength') && BigNumberEthers.isBigNumber(actualArg)) {
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
      const expected = normalizeToBigInt(expectedFlag);
      const actual = normalizeToBigInt(actualArg);
      this.assert(
        compare(functionName, expected, actual),
        `Expected "${expected}" to be ${readableName} ${actual}`,
        `Expected "${expected}" NOT to be ${readableName} ${actual}`,
        expected,
        actual
      );
    } else {
      _super.apply(this, args);
    }
  };
}

function overrideWithin(utils: Chai.ChaiUtils) {
  return (_super: (...args: any[]) => any) => overwriteBigNumberWithin(_super, utils);
}

function overwriteBigNumberWithin(_super: (...args: any[]) => any, chaiUtils: Chai.ChaiUtils) {
  return function (this: Chai.AssertionStatic, ...args: any[]) {
    const [startArg, finishArg] = args;
    const expectedFlag = chaiUtils.flag(this, 'object');
    if (isBigNumber(expectedFlag) || isBigNumber(startArg) || isBigNumber(finishArg)) {
      const expected = normalizeToBigInt(expectedFlag);
      const start = normalizeToBigInt(startArg);
      const finish = normalizeToBigInt(finishArg);
      this.assert(
        start <= expected && finish >= expected,
        `Expected "${expected}" to be within [${[start, finish]}]`,
        `Expected "${expected}" NOT to be within [${[start, finish]}]`,
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

function overwriteBigNumberCloseTo(_super: (...args: any[]) => any, chaiUtils: Chai.ChaiUtils) {
  return function (this: Chai.AssertionStatic, ...args: any[]) {
    const [actualArg, deltaArg] = args;
    const expectedFlag = chaiUtils.flag(this, 'object');
    if (isBigNumber(expectedFlag) || isBigNumber(actualArg) || isBigNumber(deltaArg)) {
      const expected = normalizeToBigInt(expectedFlag);
      const actual = normalizeToBigInt(actualArg);
      const delta = normalizeToBigInt(deltaArg);
      function abs(i: bigint): bigint {
        return i < 0 ? BigInt(-1) * i : i;
      }
      this.assert(
        abs(expected - actual) <= delta,
        `Expected "${expected}" to be within ${delta} of ${actual}`,
        `Expected "${expected}" NOT to be within ${delta} of ${actual}`,
        `A number between ${actual - delta} and ${actual + delta}`,
        expected
      );
    } else {
      _super.apply(this, args);
    }
  };
}
