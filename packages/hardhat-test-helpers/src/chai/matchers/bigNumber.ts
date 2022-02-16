import {BigNumber} from 'ethers';

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

function overwriteBigNumberFunction(
  functionName: Methods,
  readableName: string,
  _super: (...args: any[]) => any,
  chaiUtils: Chai.ChaiUtils
) {
  return function (this: Chai.AssertionStatic, ...args: any[]) {
    const [actual] = args;
    const expected = chaiUtils.flag(this, 'object');
    if (chaiUtils.flag(this, 'doLength') && BigNumber.isBigNumber(actual)) {
      _super.apply(this, [actual.toNumber()]);
      return;
    }
    if (BigNumber.isBigNumber(expected) || BigNumber.isBigNumber(actual)) {
      this.assert(
        BigNumber.from(expected)[functionName](actual),
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
    const [start, finish] = args;
    const expected = chaiUtils.flag(this, 'object');
    if (BigNumber.isBigNumber(expected) || BigNumber.isBigNumber(start) || BigNumber.isBigNumber(finish)) {
      this.assert(
        BigNumber.from(start).lte(expected) && BigNumber.from(finish).gte(expected),
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
    const [actual, delta] = args;
    const expected = chaiUtils.flag(this, 'object');
    if (BigNumber.isBigNumber(expected) || BigNumber.isBigNumber(actual) || BigNumber.isBigNumber(delta)) {
      this.assert(
        BigNumber.from(expected).sub(actual).abs().lte(delta),
        `Expected "${expected}" to be within ${delta} of ${actual}`,
        `Expected "${expected}" NOT to be within ${delta} of ${actual}`,
        `A number between ${actual.sub(delta)} and ${actual.sub(delta)}`,
        expected
      );
    } else {
      _super.apply(this, args);
    }
  };
}
