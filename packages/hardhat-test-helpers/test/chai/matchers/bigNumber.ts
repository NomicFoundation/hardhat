import { expect, AssertionError, use } from "chai";
import { BigNumber as BigNumberEthers } from "ethers";
import { BigNumber as BigNumberJs } from "bignumber.js";
import BN from "bn.js";

import { bnChai } from "../../../src/chai/matchers/bnChai";

use(bnChai);

describe("UNIT: BigNumber matchers", () => {
  function checkAll(
    actual: number,
    expected: number,
    test: (
      actual: number | string | bigint | BigNumberEthers | BigNumberJs | BN,
      expected: number | string | bigint | BigNumberEthers | BigNumberJs | BN
    ) => void
  ) {
    const conversions = [
      (n: number) => n,
      (n: number) => n.toString(),
      (n: number) => BigInt(n),
      (n: number) => BigNumberEthers.from(n),
      (n: number) => new BN(n),
      (n: number) => new BigNumberJs(n),
    ];
    for (const convertActual of conversions) {
      for (const convertExpected of conversions) {
        const convertedActual = convertActual(actual);
        const convertedExpected = convertExpected(expected);
        // a few particular combinations of types don't work:
        if (
          typeof convertedActual === "string" &&
          !BigNumberEthers.isBigNumber(convertedExpected) &&
          !BN.isBN(convertedExpected) &&
          !BigNumberJs.isBigNumber(convertedExpected)
        ) {
          continue;
        }
        if (
          typeof convertedActual === "number" &&
          typeof convertedExpected === "string"
        ) {
          continue;
        }
        test(convertedActual, convertedExpected);
      }
    }
  }

  function typestr(
    n: number | bigint | string | BN | BigNumberEthers | BigNumberJs
  ): string {
    if (typeof n === "object") {
      if (n instanceof BN) {
        return "BN";
      } else if (n instanceof BigNumberEthers) {
        return "ethers.BigNumber";
      } else if (n instanceof BigNumberJs) {
        return "bignumber.js";
      }
    }
    return typeof n;
  }

  describe("equal", () => {
    describe(".to.equal", () => {
      checkAll(10, 10, (a, b) => {
        it(`should work with ${typestr(a)} and ${typestr(b)}`, function () {
          expect(a).to.equal(b);
        });
      });
      it("throws proper message on error", () => {
        expect(() => expect(BigNumberEthers.from(10)).to.equal(11)).to.throw(
          AssertionError,
          'Expected "10" to be equal 11'
        );
      });
    });

    describe(".to.eq", () => {
      checkAll(10, 10, (a, b) => {
        it(`should work with ${typestr(a)} and ${typestr(b)}`, function () {
          expect(a).to.eq(b);
        });
      });
    });

    describe(".not.to.equal", () => {
      checkAll(10, 11, (a, b) => {
        it(`should work with ${typestr(a)} and ${typestr(b)}`, function () {
          expect(a).not.to.equal(b);
        });
      });
    });

    describe(".not.to.eq", () => {
      checkAll(10, 11, (a, b) => {
        it(`should work with ${typestr(a)} and ${typestr(b)}`, function () {
          expect(a).not.to.eq(b);
        });
      });
    });
  });

  describe("above", () => {
    describe(".to.be.above", () => {
      checkAll(10, 9, (a, b) => {
        it(`should work with ${typestr(a)} and ${typestr(b)}`, function () {
          expect(a).to.be.above(b);
        });
      });
    });

    describe(".to.be.gt", () => {
      checkAll(10, 9, (a, b) => {
        it(`should work with ${typestr(a)} and ${typestr(b)}`, function () {
          expect(a).to.be.gt(b);
        });
      });
    });

    describe(".not.to.be.above", () => {
      checkAll(10, 10, (a, b) => {
        it(`should work with 10,10 and with ${typestr(a)} and ${typestr(
          b
        )}`, function () {
          expect(a).not.to.be.above(b);
        });
      });
      checkAll(10, 11, (a, b) => {
        it(`should work with 10,11 and with ${typestr(a)} and ${typestr(
          b
        )}`, function () {
          expect(a).not.to.be.above(b);
        });
      });
    });

    describe(".not.to.be.gt", () => {
      checkAll(10, 10, (a, b) => {
        it(`should work with 10,10 and with ${typestr(a)} and ${typestr(
          b
        )}`, function () {
          expect(a).not.to.be.gt(b);
        });
      });
      checkAll(10, 11, (a, b) => {
        it(`should work with 10,11 and with ${typestr(a)} and ${typestr(
          b
        )}`, function () {
          expect(a).not.to.be.gt(b);
        });
      });
    });
  });

  describe("below", () => {
    describe(".to.be.below", () => {
      checkAll(10, 11, (a, b) => {
        it(`should work with ${typestr(a)} and ${typestr(b)}`, function () {
          expect(a).to.be.below(b);
        });
      });
    });

    describe(".to.be.lt", () => {
      checkAll(10, 11, (a, b) => {
        it(`should work with ${typestr(a)} and ${typestr(b)}`, function () {
          expect(a).to.be.lt(b);
        });
      });
    });

    describe(".not.to.be.below", () => {
      checkAll(10, 10, (a, b) => {
        it(`should work with 10,10 and with ${typestr(a)} and ${typestr(
          b
        )}`, function () {
          expect(a).not.to.be.below(b);
        });
      });
      checkAll(10, 9, (a, b) => {
        it(`should work with 10,9 and with ${typestr(a)} and ${typestr(
          b
        )}`, function () {
          expect(a).not.to.be.below(b);
        });
      });
    });

    describe(".not.to.be.lt", () => {
      checkAll(10, 10, (a, b) => {
        it(`should work with 10,10 and with ${typestr(a)} and ${typestr(
          b
        )}`, function () {
          expect(a).not.to.be.lt(b);
        });
      });
      checkAll(10, 9, (a, b) => {
        it(`should work with 10,9 and with ${typestr(a)} and ${typestr(
          b
        )}`, function () {
          expect(a).not.to.be.lt(b);
        });
      });
    });
  });

  describe("at least", () => {
    describe(".to.be.at.least", () => {
      checkAll(10, 10, (a, b) => {
        it(`should work with 10,10 and with ${typestr(a)} and ${typestr(
          b
        )}`, function () {
          expect(a).to.be.at.least(b);
        });
      });
      checkAll(10, 9, (a, b) => {
        it(`should work with 10,9 and with ${typestr(a)} and ${typestr(
          b
        )}`, function () {
          expect(a).to.be.at.least(b);
        });
      });
    });

    describe(".to.be.gte", () => {
      checkAll(10, 10, (a, b) => {
        it(`should work with 10,10 and with ${typestr(a)} and ${typestr(
          b
        )}`, function () {
          expect(a).to.be.gte(b);
        });
      });
      checkAll(10, 9, (a, b) => {
        it(`should work with 10,9 and with ${typestr(a)} and ${typestr(
          b
        )}`, function () {
          expect(a).to.be.gte(b);
        });
      });
    });

    describe(".not.to.be.at.least", () => {
      checkAll(10, 11, (a, b) => {
        it(`should work with ${typestr(a)} and ${typestr(b)}`, function () {
          expect(a).not.to.be.at.least(b);
        });
      });
    });

    describe(".not.to.be.gte", () => {
      checkAll(10, 11, (a, b) => {
        it(`should work with ${typestr(a)} and ${typestr(b)}`, function () {
          expect(a).not.to.be.gte(b);
        });
      });
    });
  });

  describe("at most", () => {
    describe(".to.be.at.most", () => {
      checkAll(10, 10, (a, b) => {
        it(`should work with 10,10 and with ${typestr(a)} and ${typestr(
          b
        )}`, function () {
          expect(a).to.be.at.most(b);
        });
      });
      checkAll(10, 11, (a, b) => {
        it(`should work with 10,11 and with ${typestr(a)} and ${typestr(
          b
        )}`, function () {
          expect(a).to.be.at.most(b);
        });
      });
    });

    describe(".to.be.lte", () => {
      checkAll(10, 10, (a, b) => {
        it(`should work with 10,10 and with ${typestr(a)} and ${typestr(
          b
        )}`, function () {
          expect(a).to.be.lte(b);
        });
      });
      checkAll(10, 11, (a, b) => {
        it(`should work with 10,11 and with ${typestr(a)} and ${typestr(
          b
        )}`, function () {
          expect(a).to.be.lte(b);
        });
      });
    });

    describe(".not.to.be.at.most", () => {
      checkAll(10, 9, (a, b) => {
        it(`should work with 10,9 and with ${typestr(a)} and ${typestr(
          b
        )}`, function () {
          expect(a).not.to.be.at.most(b);
        });
      });
    });

    describe(".not.to.be.lte", () => {
      checkAll(10, 9, (a, b) => {
        it(`should work with 10,9 and with ${typestr(a)} and ${typestr(
          b
        )}`, function () {
          expect(a).not.to.be.lte(b);
        });
      });
    });
  });

  function checkAllWith3Args(
    a: number,
    b: number,
    c: number,
    test: (
      a: number | bigint | BigNumberEthers | BigNumberJs | BN,
      b: number | bigint | BigNumberEthers | BigNumberJs | BN,
      c: number | bigint | BigNumberEthers | BigNumberJs | BN
    ) => void
  ) {
    const conversions = [
      (n: number) => n,
      (n: number) => BigInt(n),
      (n: number) => BigNumberEthers.from(n),
      (n: number) => new BigNumberJs(n),
      (n: number) => new BN(n),
    ];
    for (const convertA of conversions) {
      for (const convertB of conversions) {
        for (const convertC of conversions) {
          test(convertA(a), convertB(b), convertC(c));
        }
      }
    }
  }

  describe("within", () => {
    describe(".to.be.within", () => {
      checkAllWith3Args(100, 99, 101, (a, b, c) => {
        it(`should work with ${typestr(a)}, ${typestr(b)} and ${typestr(
          c
        )}`, function () {
          expect(a).to.be.within(b, c);
        });
      });
      it("expect to throw on error", () => {
        expect(() =>
          checkAllWith3Args(100, 80, 90, (a, b, c) =>
            expect(a).to.be.within(b, c)
          )
        ).to.throw(AssertionError, "expected 100 to be within 80..90");
      });
    });

    describe(".not.to.be.within", () => {
      checkAllWith3Args(100, 101, 102, (a, b, c) => {
        it(`should work with ${typestr(a)}, ${typestr(b)} and ${typestr(
          c
        )}`, function () {
          expect(a).not.to.be.within(b, c);
        });
      });
      checkAllWith3Args(100, 98, 99, (a, b, c) => {
        it(`should work with ${typestr(a)}, ${typestr(b)} and ${typestr(
          c
        )}`, function () {
          expect(a).not.to.be.within(b, c);
        });
      });
      it("expect to throw on error", () => {
        expect(() =>
          checkAllWith3Args(100, 99, 101, (a, b, c) =>
            expect(a).not.to.be.within(b, c)
          )
        ).to.throw(AssertionError, "expected 100 to not be within 99..101");
      });
    });
  });

  describe("closeTo", () => {
    describe(".to.be.closeTo", () => {
      checkAllWith3Args(100, 101, 10, (a, b, c) => {
        it(`should work with ${typestr(a)}, ${typestr(b)} and ${typestr(
          c
        )}`, function () {
          expect(a).to.be.closeTo(b, c);
        });
      });
      it("expect to throw on error", () => {
        expect(() =>
          checkAllWith3Args(100, 111, 10, (a, b, c) =>
            expect(a).to.be.closeTo(b, c)
          )
        ).to.throw(AssertionError, "expected 100 to be close to 111 +/- 10");
      });
    });

    describe(".not.to.be.closeTo", () => {
      checkAllWith3Args(100, 111, 10, (a, b, c) => {
        it(`should work with ${typestr(a)}, ${typestr(b)} and ${typestr(
          c
        )}`, function () {
          expect(a).to.not.be.closeTo(b, c);
        });
      });
      it("expect to throw on error", () => {
        expect(() =>
          checkAllWith3Args(100, 101, 10, (a, b, c) =>
            expect(a).not.to.be.closeTo(b, c)
          )
        ).to.throw(AssertionError, "expected 100 not to be close to 101");
      });
    });
  });
});
