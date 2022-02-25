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
    const [actual] = args;
    const expected = chaiUtils.flag(this, 'object');
    if (chaiUtils.flag(this, 'doLength') && BigNumberEthers.isBigNumber(actual)) {
      _super.apply(this, [actual.toNumber()]);
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
    if (isBigNumber(expected) || isBigNumber(actual)) {
      const expectedAsBigInt = normalizeToBigInt(expected);
      const actualAsBigInt = normalizeToBigInt(actual);
      this.assert(
        compare(functionName, expectedAsBigInt, actualAsBigInt),
        `Expected "${expectedAsBigInt}" to be ${readableName} ${actualAsBigInt}`,
        `Expected "${expectedAsBigInt}" NOT to be ${readableName} ${actualAsBigInt}`,
        expectedAsBigInt,
        actualAsBigInt
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
    const [start, finish] = args;
    const expected = chaiUtils.flag(this, 'object');
    if (isBigNumber(expected) || isBigNumber(start) || isBigNumber(finish)) {
      const expectedAsBigInt = normalizeToBigInt(expected);
      const startAsBigInt = normalizeToBigInt(start);
      const finishAsBigInt = normalizeToBigInt(finish);
      this.assert(
        startAsBigInt <= expectedAsBigInt && finishAsBigInt >= expectedAsBigInt,
        `Expected "${expectedAsBigInt}" to be within [${[startAsBigInt, finishAsBigInt]}]`,
        `Expected "${expectedAsBigInt}" NOT to be within [${[startAsBigInt, finishAsBigInt]}]`,
        [startAsBigInt, finishAsBigInt],
        expectedAsBigInt
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
    const [actual, delta] = args;
    const expected = chaiUtils.flag(this, 'object');
    if (isBigNumber(expected) || isBigNumber(actual) || isBigNumber(delta)) {
      const expectedAsBigInt = normalizeToBigInt(expected);
      const actualAsBigInt = normalizeToBigInt(actual);
      const deltaAsBigInt = normalizeToBigInt(delta);
      function abs(i: bigint): bigint {
        return i < 0 ? BigInt(-1) * i : i;
      }
      this.assert(
        abs(expectedAsBigInt - actualAsBigInt) <= deltaAsBigInt,
        `Expected "${expectedAsBigInt}" to be within ${deltaAsBigInt} of ${actualAsBigInt}`,
        `Expected "${expectedAsBigInt}" NOT to be within ${deltaAsBigInt} of ${actualAsBigInt}`,
        `A number between ${actualAsBigInt - deltaAsBigInt} and ${actualAsBigInt + deltaAsBigInt}`,
        expectedAsBigInt
      );
    } else {
      _super.apply(this, args);
    }
  };
}
