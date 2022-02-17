import {expect, AssertionError, use} from 'chai';
import {BigNumber} from 'ethers';
import BN from "bn.js";

import { bnChai } from "../../../src/chai/matchers/bnChai";

use(bnChai);

describe('UNIT: BigNumber matchers', () => {
  function checkAll(
    actual: number,
    expected: number,
    test: (actual: number | string | BigNumber | BN, expected: number | string | BigNumber | BN) => void
  ) {
    test(actual, expected);
    test(BigNumber.from(actual), expected);
    test(BigNumber.from(actual), expected.toString());
    test(BigNumber.from(actual), BigNumber.from(expected));
    test(BigNumber.from(actual), new BN(expected));
    test(actual, BigNumber.from(expected));
    test(actual, new BN(expected));
    test(actual.toString(), BigNumber.from(expected));
    test(actual.toString(), new BN(expected));
    test(new BN(actual), expected);
    test(new BN(actual), expected.toString());
    test(new BN(actual), BigNumber.from(expected));
    test(new BN(actual), new BN(expected));
  }

  describe('equal', () => {
    it('.to.equal', () => {
      checkAll(10, 10, (a, b) => expect(a).to.equal(b));
    });

    it('.to.eq', () => {
      checkAll(10, 10, (a, b) => expect(a).to.eq(b));
    });

    it('.not.to.equal', () => {
      checkAll(10, 11, (a, b) => expect(a).not.to.equal(b));
    });

    it('.not.to.eq', () => {
      checkAll(10, 11, (a, b) => expect(a).not.to.eq(b));
    });

    it('throws proper message on error', () => {
      expect(() => expect(BigNumber.from(10)).to.equal(11)).to.throw(AssertionError, 'Expected "10" to be equal 11');
    });
  });

  describe('above', () => {
    it('.to.be.above', () => {
      checkAll(10, 9, (a, b) => expect(a).to.be.above(b));
    });

    it('.to.be.gt', () => {
      checkAll(10, 9, (a, b) => expect(a).to.be.gt(b));
    });

    it('.not.to.be.above', () => {
      checkAll(10, 10, (a, b) => expect(a).not.to.be.above(b));
      checkAll(10, 11, (a, b) => expect(a).not.to.be.above(b));
    });

    it('.not.to.be.gt', () => {
      checkAll(10, 10, (a, b) => expect(a).not.to.be.gt(b));
      checkAll(10, 11, (a, b) => expect(a).not.to.be.gt(b));
    });
  });

  describe('below', () => {
    it('.to.be.below', () => {
      checkAll(10, 11, (a, b) => expect(a).to.be.below(b));
    });

    it('.to.be.lt', () => {
      checkAll(10, 11, (a, b) => expect(a).to.be.lt(b));
    });

    it('.not.to.be.below', () => {
      checkAll(10, 10, (a, b) => expect(a).not.to.be.below(b));
      checkAll(10, 9, (a, b) => expect(a).not.to.be.below(b));
    });

    it('.not.to.be.lt', () => {
      checkAll(10, 10, (a, b) => expect(a).not.to.be.lt(b));
      checkAll(10, 9, (a, b) => expect(a).not.to.be.lt(b));
    });
  });

  describe('at least', () => {
    it('.to.be.at.least', () => {
      checkAll(10, 10, (a, b) => expect(a).to.be.at.least(b));
      checkAll(10, 9, (a, b) => expect(a).to.be.at.least(b));
    });

    it('.to.be.gte', () => {
      checkAll(10, 10, (a, b) => expect(a).to.be.gte(b));
      checkAll(10, 9, (a, b) => expect(a).to.be.gte(b));
    });

    it('.not.to.be.at.least', () => {
      checkAll(10, 11, (a, b) => expect(a).not.to.be.at.least(b));
    });

    it('.not.to.be.gte', () => {
      checkAll(10, 11, (a, b) => expect(a).not.to.be.gte(b));
    });
  });

  describe('at most', () => {
    it('.to.be.at.most', () => {
      checkAll(10, 10, (a, b) => expect(a).to.be.at.most(b));
      checkAll(10, 11, (a, b) => expect(a).to.be.at.most(b));
    });

    it('.to.be.lte', () => {
      checkAll(10, 10, (a, b) => expect(a).to.be.lte(b));
      checkAll(10, 11, (a, b) => expect(a).to.be.lte(b));
    });

    it('.not.to.be.at.most', () => {
      checkAll(10, 9, (a, b) => expect(a).not.to.be.at.most(b));
    });

    it('.not.to.be.lte', () => {
      checkAll(10, 9, (a, b) => expect(a).not.to.be.lte(b));
    });
  });

  describe('within', () => {
    it('.to.be.within', () => {
      expect(BigNumber.from(100)).to.be.within(BigNumber.from(99), BigNumber.from(101));
    });

    it('.not.to.be.within', () => {
      expect(BigNumber.from(100)).not.to.be.within(BigNumber.from(101), BigNumber.from(102));
      expect(BigNumber.from(100)).not.to.be.within(BigNumber.from(98), BigNumber.from(99));
    });

    it('expect to throw on error', () => {
      expect(() => expect(BigNumber.from(100)).to.be.within(BigNumber.from(80), BigNumber.from(90))).to.throw(
        AssertionError,
        'Expected "100" to be within [80,90]'
      );
      expect(() => expect(BigNumber.from(100)).not.to.be.within(BigNumber.from(99), BigNumber.from(101))).to.throw(
        AssertionError,
        'Expected "100" NOT to be within [99,101]'
      );
    });
  });

  describe('closeTo', () => {
    function checkAllCloseTo(
      actual: number,
      expected: number,
      delta: number,
      test: (
        actual: number | string | BigNumber | BN,
        expected: number | string | BigNumber | BN,
        delta: number | string | BigNumber | BN
      ) => void
    ) {
      const conversions = [
        (n: number) => n,
        (n: number) => BigNumber.from(n),
        (n: number) => new BN(n),
      ];
      for (const convertActual of conversions) {
        for (const convertExpected of conversions) {
          for (const convertDelta of conversions) {
            test(
              convertActual(actual),
              convertExpected(expected),
              convertDelta(delta)
            );
          }
        }
      }
    }
    it('.to.be.closeTo', () => {
      checkAllCloseTo(100, 101, 10, (a, e, d) => expect(a).to.be.closeTo(e, d));
    });

    it('.not.to.be.closeTo', () => {
      checkAllCloseTo(100, 111, 10, (a, e, d) => expect(a).to.not.be.closeTo(e, d));
    });

    it('expect to throw on error', () => {
      expect(
        () => checkAllCloseTo(100, 111, 10, (a, e, d) => expect(a).to.be.closeTo(e, d))
      ).to.throw(AssertionError, "expected 100 to be close to 111 +/- 10");
      expect(
        () => checkAllCloseTo(100, 101, 10, (a, e, d) => expect(a).not.to.be.closeTo(e, d))
      ).to.throw(AssertionError, "expected 100 not to be close to 101");
    });
  });
});
