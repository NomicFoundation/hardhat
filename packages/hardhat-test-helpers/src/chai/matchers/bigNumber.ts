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

function normalizeToBigNumber(
  source: bigint | BigNumberEthers | BigNumberJs | BN | number | string
): BigNumberEthers {
  if (typeof source === "bigint") {
    return BigNumberEthers.from(source);
  } else if (source instanceof BigNumberEthers) {
    return BigNumberEthers.from(source);
  } else if (source instanceof BN) {
    return BigNumberEthers.from(source.toString());
  } else if (source instanceof BigNumberJs) {
    return BigNumberEthers.from(source.toString(10));
  } else if (typeof source === "string" || typeof source === "number") {
    return BigNumberEthers.from(source)
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
    if (isBigNumber(expected) || isBigNumber(actual)) {
      const expectedAsBigNumber = normalizeToBigNumber(expected);
      const actualAsBigNumber = normalizeToBigNumber(actual);
      this.assert(
        BigNumberEthers.from(expectedAsBigNumber)[functionName](actualAsBigNumber),
        `Expected "${expectedAsBigNumber}" to be ${readableName} ${actualAsBigNumber}`,
        `Expected "${expectedAsBigNumber}" NOT to be ${readableName} ${actualAsBigNumber}`,
        expectedAsBigNumber,
        actualAsBigNumber
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
      const expectedAsBigNumber = normalizeToBigNumber(expected);
      const startAsBigNumber = normalizeToBigNumber(start);
      const finishAsBigNumber = normalizeToBigNumber(finish);
      this.assert(
        BigNumberEthers.from(startAsBigNumber).lte(expectedAsBigNumber) && BigNumberEthers.from(finishAsBigNumber).gte(expectedAsBigNumber),
        `Expected "${expectedAsBigNumber}" to be within [${[startAsBigNumber, finishAsBigNumber]}]`,
        `Expected "${expectedAsBigNumber}" NOT to be within [${[startAsBigNumber, finishAsBigNumber]}]`,
        [startAsBigNumber, finishAsBigNumber],
        expectedAsBigNumber
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
      const expectedAsBigNumber = normalizeToBigNumber(expected);
      const actualAsBigNumber = normalizeToBigNumber(actual);
      const deltaAsBigNumber = normalizeToBigNumber(delta);
      this.assert(
        BigNumberEthers.from(expectedAsBigNumber).sub(actualAsBigNumber).abs().lte(deltaAsBigNumber),
        `Expected "${expectedAsBigNumber}" to be within ${deltaAsBigNumber} of ${actualAsBigNumber}`,
        `Expected "${expectedAsBigNumber}" NOT to be within ${deltaAsBigNumber} of ${actualAsBigNumber}`,
        `A number between ${actualAsBigNumber.sub(deltaAsBigNumber)} and ${actualAsBigNumber.sub(deltaAsBigNumber)}`,
        expectedAsBigNumber
      );
    } else {
      _super.apply(this, args);
    }
  };
}
