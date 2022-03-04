import { expect, AssertionError, use } from "chai";
import { BigNumber as BigNumberEthers } from "ethers";
import { BigNumber as BigNumberJs } from "bignumber.js";
import BN from "bn.js";

import { bnChai } from "../../../src/chai/matchers/bnChai";
import { SupportedNumber } from "../../../src/chai/matchers/bigNumber";

use(bnChai);

const numberToBigNumberConversions = [
  (n: number) => BigInt(n),
  (n: number) => BigNumberEthers.from(n),
  (n: number) => new BN(n),
  (n: number) => new BigNumberJs(n),
];

describe("BigNumber matchers", function () {
  function typestr(n: string | SupportedNumber): string {
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

  describe("with two arguments", function () {
    function checkAll(
      actual: number,
      expected: number,
      test: (
        actual: string | SupportedNumber,
        expected: string | SupportedNumber
      ) => void
    ) {
      const conversions = [
        (n: number) => n,
        (n: number) => n.toString(),
        ...numberToBigNumberConversions,
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

    const operators = [
      "equals",
      "equal",
      "eq",
      "above",
      "below",
      "gt",
      "lt",
      "greaterThan",
      "lessThan",
      "least",
      "most",
      "gte",
      "lte",
      "greaterThanOrEqual",
      "lessThanOrEqual",
    ] as const;
    type Operator = typeof operators[number];

    interface SuccessCase {
      operator: Operator;
      operands: [number, number];
    }

    interface FailureCase extends SuccessCase {
      msg: string;
    }

    const positiveSuccessCases: SuccessCase[] = [
      { operands: [10, 10], operator: "eq" },
      { operands: [10, 10], operator: "equal" },
      { operands: [10, 10], operator: "equals" },
      { operands: [10, 9], operator: "above" },
      { operands: [10, 9], operator: "gt" },
      { operands: [10, 9], operator: "greaterThan" },
      { operands: [10, 11], operator: "below" },
      { operands: [10, 11], operator: "lt" },
      { operands: [10, 11], operator: "lessThan" },
      { operands: [10, 10], operator: "least" },
      { operands: [10, 10], operator: "gte" },
      { operands: [10, 10], operator: "greaterThanOrEqual" },
      { operands: [10, 9], operator: "least" },
      { operands: [10, 9], operator: "gte" },
      { operands: [10, 9], operator: "greaterThanOrEqual" },
      { operands: [10, 10], operator: "most" },
      { operands: [10, 10], operator: "lte" },
      { operands: [10, 10], operator: "lessThanOrEqual" },
      { operands: [10, 11], operator: "most" },
      { operands: [10, 11], operator: "lte" },
      { operands: [10, 11], operator: "lessThanOrEqual" },
    ];
    for (const { operator, operands } of positiveSuccessCases) {
      describe(`.to.${operator}`, function () {
        checkAll(operands[0], operands[1], (a, b) => {
          it(`should work with ${typestr(a)} and ${typestr(b)}`, function () {
            expect(a).to[operator](b);
          });
        });
      });
    }

    const eqPositiveFailureCase: Omit<FailureCase, "operator"> = {
      operands: [10, 11],
      msg: "expected 10 to equal 11",
    };
    const gtPositiveFailureCase: Omit<FailureCase, "operator"> = {
      operands: [10, 10],
      msg: "expected 10 to be above 10",
    };
    const ltPositiveFailureCase: Omit<FailureCase, "operator"> = {
      operands: [11, 10],
      msg: "expected 11 to be below 10",
    };
    const gtePositiveFailureCase: Omit<FailureCase, "operator"> = {
      operands: [10, 11],
      msg: "expected 10 to be at least 11",
    };
    const ltePositiveFailureCase: Omit<FailureCase, "operator"> = {
      operands: [11, 10],
      msg: "expected 11 to be at most 10",
    };
    const positiveFailureCases: FailureCase[] = [
      { ...eqPositiveFailureCase, operator: "eq" },
      { ...eqPositiveFailureCase, operator: "equal" },
      { ...eqPositiveFailureCase, operator: "equals" },
      { ...gtPositiveFailureCase, operator: "above" },
      { ...gtPositiveFailureCase, operator: "gt" },
      { ...gtPositiveFailureCase, operator: "greaterThan" },
      { ...ltPositiveFailureCase, operator: "below" },
      { ...ltPositiveFailureCase, operator: "lt" },
      { ...ltPositiveFailureCase, operator: "lessThan" },
      { ...gtePositiveFailureCase, operator: "least" },
      { ...gtePositiveFailureCase, operator: "gte" },
      { ...gtePositiveFailureCase, operator: "greaterThanOrEqual" },
      { ...ltePositiveFailureCase, operator: "most" },
      { ...ltePositiveFailureCase, operator: "lte" },
      { ...ltePositiveFailureCase, operator: "lessThanOrEqual" },
    ];
    for (const { operator, operands, msg } of positiveFailureCases) {
      describe(`.to.${operator} should throw the proper message on failure`, function () {
        checkAll(operands[0], operands[1], (a, b) => {
          it(`with ${typestr(a)} and ${typestr(b)}`, function () {
            expect(() => expect(a).to[operator](b)).to.throw(
              AssertionError,
              msg
            );
          });
        });
      });
    }

    const negativeSuccessCases: SuccessCase[] = [
      { operands: [11, 10], operator: "eq" },
      { operands: [11, 10], operator: "equal" },
      { operands: [11, 10], operator: "equals" },
      { operands: [10, 10], operator: "above" },
      { operands: [10, 10], operator: "gt" },
      { operands: [10, 10], operator: "greaterThan" },
      { operands: [10, 10], operator: "below" },
      { operands: [10, 10], operator: "lt" },
      { operands: [10, 10], operator: "lessThan" },
      { operands: [10, 9], operator: "below" },
      { operands: [10, 9], operator: "lt" },
      { operands: [10, 9], operator: "lessThan" },
      { operands: [10, 11], operator: "least" },
      { operands: [10, 11], operator: "gte" },
      { operands: [10, 11], operator: "greaterThanOrEqual" },
      { operands: [10, 9], operator: "most" },
      { operands: [10, 9], operator: "lte" },
      { operands: [10, 9], operator: "lessThanOrEqual" },
    ];
    for (const { operator, operands } of negativeSuccessCases) {
      describe(`.not.to.${operator}`, function () {
        checkAll(operands[0], operands[1], (a, b) => {
          it(`should work with ${typestr(a)} and ${typestr(b)}`, function () {
            expect(a).not.to[operator](b);
          });
        });
      });
    }

    const gtNegativeFailureCase: Omit<FailureCase, "operator"> = {
      operands: [11, 10],
      msg: "expected 11 to be at most 10",
    };
    const eqNegativeFailureCase: Omit<FailureCase, "operator"> = {
      operands: [10, 10],
      msg: "expected 10 to not equal 10",
    };
    const ltNegativeFailureCase: Omit<FailureCase, "operator"> = {
      operands: [10, 11],
      msg: "expected 10 to be at least 11",
    };
    const gteNegativeFailureCase: Omit<FailureCase, "operator"> = {
      operands: [11, 10],
      msg: "expected 11 to be below 10",
    };
    const lteNegativeFailureCase: Omit<FailureCase, "operator"> = {
      operands: [10, 11],
      msg: "expected 10 to be above 11",
    };
    const negativeFailureCases: FailureCase[] = [
      { ...eqNegativeFailureCase, operator: "eq" },
      { ...eqNegativeFailureCase, operator: "equal" },
      { ...eqNegativeFailureCase, operator: "equals" },
      { ...gtNegativeFailureCase, operator: "above" },
      { ...gtNegativeFailureCase, operator: "gt" },
      { ...gtNegativeFailureCase, operator: "greaterThan" },
      { ...ltNegativeFailureCase, operator: "below" },
      { ...ltNegativeFailureCase, operator: "lt" },
      { ...ltNegativeFailureCase, operator: "lessThan" },
      { ...gteNegativeFailureCase, operator: "least" },
      { ...gteNegativeFailureCase, operator: "gte" },
      { ...gteNegativeFailureCase, operator: "greaterThanOrEqual" },
      { ...lteNegativeFailureCase, operator: "most" },
      { ...lteNegativeFailureCase, operator: "lte" },
      { ...lteNegativeFailureCase, operator: "lessThanOrEqual" },
    ];
    for (const { operator, operands, msg } of negativeFailureCases) {
      describe("should throw the proper message on failure", function () {
        checkAll(operands[0], operands[1], (a, b) => {
          it(`with ${typestr(a)} and ${typestr(b)}`, function () {
            expect(() => expect(a).not.to[operator](b)).to.throw(
              AssertionError,
              msg
            );
          });
        });
      });
    }

    operators.forEach((operator: Operator) => {
      describe("should throw when comparing to a non-integral floating point literal", function () {
        for (const convert of numberToBigNumberConversions) {
          const converted = convert(1);
          const msg =
            "The number 1.1 cannot be converted to a BigInt because it is not an integer";
          it(`with .to.${operator} comparing float vs ${typestr(
            converted
          )}`, function () {
            expect(() => expect(1.1).to[operator](converted)).to.throw(
              RangeError,
              msg
            );
          });
          it(`with .to.${operator} comparing ${typestr(
            converted
          )} vs float`, function () {
            expect(() => expect(converted).to[operator](1.1)).to.throw(
              RangeError,
              msg
            );
          });
          it(`with .not.to.${operator} comparing float vs ${typestr(
            converted
          )}`, function () {
            expect(() => expect(1.1).not.to[operator](converted)).to.throw(
              RangeError,
              msg
            );
          });
          it(`with .not.to.${operator} comparing ${typestr(
            converted
          )} vs float`, function () {
            expect(() => expect(converted).not.to[operator](1.1)).to.throw(
              RangeError,
              msg
            );
          });
        }
      });
    });
  });

  describe("with three arguments", function () {
    function checkAll(
      a: number,
      b: number,
      c: number,
      test: (a: SupportedNumber, b: SupportedNumber, c: SupportedNumber) => void
    ) {
      const conversions = [(n: number) => n, ...numberToBigNumberConversions];
      for (const convertA of conversions) {
        for (const convertB of conversions) {
          for (const convertC of conversions) {
            test(convertA(a), convertB(b), convertC(c));
          }
        }
      }
    }

    const operators = ["within", "closeTo"] as const;
    type Operator = typeof operators[number];

    interface SuccessCase {
      operator: Operator;
      operands: [number, number, number];
    }

    interface FailureCase extends SuccessCase {
      msg: string;
    }

    const positiveSuccessCases: SuccessCase[] = [
      { operator: "within", operands: [100, 99, 101] },
      { operator: "closeTo", operands: [101, 101, 10] },
    ];
    for (const { operator, operands } of positiveSuccessCases) {
      describe(`.to.be.${operator}`, function () {
        checkAll(operands[0], operands[1], operands[2], (a, b, c) => {
          it(`should work with ${typestr(a)}, ${typestr(b)} and ${typestr(
            c
          )}`, function () {
            expect(a).to.be[operator](b, c);
          });
        });
      });
    }

    const positiveFailureCases: FailureCase[] = [
      {
        operator: "within",
        operands: [100, 80, 90],
        msg: "expected 100 to be within 80..90",
      },
      {
        operator: "closeTo",
        operands: [100, 111, 10],
        msg: "expected 100 to be close to 111",
      },
    ];
    for (const { operator, operands, msg } of positiveFailureCases) {
      describe(`.to.be.${operator} should throw the proper message on failure`, function () {
        checkAll(operands[0], operands[1], operands[2], (a, b, c) => {
          it(`with ${typestr(a)}, ${typestr(b)} and ${typestr(
            c
          )}`, function () {
            expect(() => expect(a).to.be[operator](b, c)).to.throw(
              AssertionError,
              msg
            );
          });
        });
      });
    }

    const negativeSuccessCases: SuccessCase[] = [
      { operator: "within", operands: [100, 101, 102] },
      { operator: "within", operands: [100, 98, 99] },
      { operator: "closeTo", operands: [100, 111, 10] },
    ];
    for (const { operator, operands } of negativeSuccessCases) {
      describe(`.not.to.be.${operator}`, function () {
        checkAll(operands[0], operands[1], operands[2], (a, b, c) => {
          it(`should work with ${typestr(a)}, ${typestr(b)} and ${typestr(
            c
          )}`, function () {
            expect(a).not.to.be[operator](b, c);
          });
        });
      });
    }

    const negativeFailureCases: FailureCase[] = [
      {
        operator: "within",
        operands: [100, 99, 101],
        msg: "expected 100 to not be within 99..101",
      },
      {
        operator: "closeTo",
        operands: [100, 101, 10],
        msg: "expected 100 not to be close to 101",
      },
    ];
    for (const { operator, operands, msg } of negativeFailureCases) {
      describe(`.not.to.be.${operator} should throw the proper message on failure`, function () {
        checkAll(operands[0], operands[1], operands[2], (a, b, c) => {
          it(`with ${typestr(a)}, ${typestr(b)} and ${typestr(
            c
          )}`, function () {
            expect(() => expect(a).not.to.be[operator](b, c)).to.throw(
              AssertionError,
              msg
            );
          });
        });
      });
    }

    operators.forEach((operator: Operator) => {
      describe(`should throw when comparing to a non-integral floating point literal`, function () {
        for (const convertA of numberToBigNumberConversions) {
          for (const convertB of numberToBigNumberConversions) {
            const a = convertA(1);
            const b = convertB(1);
            const msg =
              "The number 1.1 cannot be converted to a BigInt because it is not an integer";
            describe(`with .to.${operator}`, function () {
              it(`with float, ${typestr(a)}, ${typestr(a)}`, function () {
                expect(() => expect(1.1).to[operator](a, b)).to.throw(
                  RangeError,
                  msg
                );
              });
              it(`with ${typestr(a)}, float, ${typestr(b)}`, function () {
                expect(() => expect(a).to[operator](1.1, b)).to.throw(
                  RangeError,
                  msg
                );
              });
              it(`with ${typestr(a)}, ${typestr(b)}, float`, function () {
                expect(() => expect(a).to[operator](b, 1.1)).to.throw(
                  RangeError,
                  msg
                );
              });
            });
            describe(`with not.to.${operator}`, function () {
              it(`with float, ${typestr(a)}, ${typestr(a)}`, function () {
                expect(() => expect(1.1).not.to[operator](a, b)).to.throw(
                  RangeError,
                  msg
                );
              });
              it(`with ${typestr(a)}, float, ${typestr(b)}`, function () {
                expect(() => expect(a).not.to[operator](1.1, b)).to.throw(
                  RangeError,
                  msg
                );
              });
              it(`with ${typestr(a)}, ${typestr(b)}, float`, function () {
                expect(() => expect(a).not.to[operator](b, 1.1)).to.throw(
                  RangeError,
                  msg
                );
              });
            });
          }
        }
      });
    });
  });
});
