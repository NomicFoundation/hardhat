import { expect, AssertionError } from "chai";
import { default as BigNumberJs } from "bignumber.js";
import BN from "bn.js";

import { HardhatError } from "hardhat/internal/core/errors";

import "../src/internal/add-chai-matchers";

type SupportedNumber = number | bigint | BN | BigNumberJs;

const numberToBigNumberConversions = [
  (n: number) => BigInt(n),
  (n: number) => new BN(n),
  (n: number) => new BigNumberJs(n),
];

describe("BigNumber matchers", function () {
  function typestr(n: string | SupportedNumber): string {
    if (typeof n === "object") {
      if (n instanceof BN) {
        return "BN";
      } else if (n instanceof BigNumberJs) {
        return "bignumber.js";
      }
    }
    return typeof n;
  }

  describe("length", function () {
    const lengthFunctions: Array<
      keyof Chai.Assertion & ("length" | "lengthOf")
    > = ["length", "lengthOf"];

    interface SuccessCase {
      obj: object;
      len: number;
    }

    const positiveSuccessCases: SuccessCase[] = [
      { obj: [1, 2, 3], len: 3 },
      {
        obj: new Map([
          [1, 2],
          [3, 4],
        ]),
        len: 2,
      },
      { obj: new Set([1, 2, 3]), len: 3 },
    ];
    describe("positive, successful assertions", function () {
      for (const { obj, len } of positiveSuccessCases) {
        for (const convert of [
          (n: number) => n,
          ...numberToBigNumberConversions,
        ]) {
          const length = convert(len);
          describe(`with object ${obj.toString()} and with length operand of type ${typestr(
            length
          )}`, function () {
            for (const lenFunc of lengthFunctions) {
              it(`.to.have.${lenFunc} should work`, function () {
                expect(obj).to.have[lenFunc](length);
              });
            }
          });
        }
      }
    });

    const negativeSuccessCases: SuccessCase[] = [
      { obj: [1, 2, 3], len: 2 },
      {
        obj: new Map([
          [1, 2],
          [3, 4],
        ]),
        len: 3,
      },
      { obj: new Set([1, 2, 3]), len: 4 },
    ];
    describe("negative, successful assertions", function () {
      for (const { obj, len } of negativeSuccessCases) {
        for (const convert of [
          (n: number) => n,
          ...numberToBigNumberConversions,
        ]) {
          const length = convert(len);
          describe(`with object ${obj.toString()} and with length operand of type ${typestr(
            length
          )}`, function () {
            for (const lenFunc of lengthFunctions) {
              it(`should work with .not.to.have.${lenFunc}`, function () {
                expect(obj).not.to.have[lenFunc](length);
              });
            }
          });
        }
      }
    });

    interface FailureCase extends SuccessCase {
      msg: string | RegExp;
    }

    const positiveFailureCases: FailureCase[] = [
      {
        obj: [1, 2, 3],
        len: 2,
        msg: "expected [ 1, 2, 3 ] to have a length of 2 but got 3",
      },
      {
        obj: new Set([1, 2, 3]),
        len: 2,
        msg: /expected .* to have a size of 2 but got 3/,
      },
      {
        obj: new Map([
          [1, 2],
          [3, 4],
        ]),
        len: 3,
        msg: /expected .* to have a size of 3 but got 2/,
      },
    ];
    describe("positive, failing assertions should throw the proper error message", function () {
      for (const { obj, len, msg } of positiveFailureCases) {
        for (const convert of [
          (n: number) => n,
          ...numberToBigNumberConversions,
        ]) {
          const length = convert(len);
          describe(`with object ${obj.toString()} and with operand of type ${typestr(
            length
          )}`, function () {
            for (const lenFunc of lengthFunctions) {
              it(`should work with .to.have.${lenFunc}`, function () {
                expect(() => expect(obj).to.have[lenFunc](length)).to.throw(
                  AssertionError,
                  msg
                );
              });
            }
          });
        }
      }
    });

    const operators = [
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

    interface SuccessCaseWithOperator extends SuccessCase {
      operator: Operator;
    }

    const positiveSuccessCasesWithOperator: SuccessCaseWithOperator[] = [
      { operator: "lt", len: 4, obj: [1, 2, 3] },
      { operator: "lt", len: 4, obj: new Set([1, 2, 3]) },
      {
        operator: "lt",
        len: 4,
        obj: new Map([
          [1, 2],
          [3, 4],
          [5, 6],
        ]),
      },
      { operator: "above", len: 2, obj: [1, 2, 3] },
      { operator: "above", len: 2, obj: new Set([1, 2, 3]) },
      {
        operator: "above",
        len: 2,
        obj: new Map([
          [1, 2],
          [3, 4],
          [5, 6],
        ]),
      },
      { operator: "gt", len: 2, obj: [1, 2, 3] },
      { operator: "gt", len: 2, obj: new Set([1, 2, 3]) },
      {
        operator: "gt",
        len: 2,
        obj: new Map([
          [1, 2],
          [3, 4],
          [5, 6],
        ]),
      },
      { operator: "greaterThan", len: 2, obj: [1, 2, 3] },
      { operator: "greaterThan", len: 2, obj: new Set([1, 2, 3]) },
      {
        operator: "greaterThan",
        len: 2,
        obj: new Map([
          [1, 2],
          [3, 4],
          [5, 6],
        ]),
      },
      { operator: "least", len: 3, obj: [1, 2, 3] },
      { operator: "least", len: 3, obj: new Set([1, 2, 3]) },
      {
        operator: "least",
        len: 3,
        obj: new Map([
          [1, 2],
          [3, 4],
          [5, 6],
        ]),
      },
      { operator: "most", len: 3, obj: [1, 2, 3] },
      { operator: "most", len: 3, obj: new Set([1, 2, 3]) },
      {
        operator: "most",
        len: 3,
        obj: new Map([
          [1, 2],
          [3, 4],
          [5, 6],
        ]),
      },
      { operator: "gte", len: 3, obj: [1, 2, 3] },
      { operator: "gte", len: 3, obj: new Set([1, 2, 3]) },
      {
        operator: "gte",
        len: 3,
        obj: new Map([
          [1, 2],
          [3, 4],
          [5, 6],
        ]),
      },
      { operator: "lte", len: 3, obj: [1, 2, 3] },
      { operator: "lte", len: 3, obj: new Set([1, 2, 3]) },
      {
        operator: "lte",
        len: 3,
        obj: new Map([
          [1, 2],
          [3, 4],
          [5, 6],
        ]),
      },
      { operator: "greaterThanOrEqual", len: 3, obj: [1, 2, 3] },
      { operator: "greaterThanOrEqual", len: 3, obj: new Set([1, 2, 3]) },
      {
        operator: "greaterThanOrEqual",
        len: 3,
        obj: new Map([
          [1, 2],
          [3, 4],
          [5, 6],
        ]),
      },
      { operator: "lessThanOrEqual", len: 3, obj: [1, 2, 3] },
      { operator: "lessThanOrEqual", len: 3, obj: new Set([1, 2, 3]) },
      {
        operator: "lessThanOrEqual",
        len: 3,
        obj: new Map([
          [1, 2],
          [3, 4],
          [5, 6],
        ]),
      },
    ];
    describe("positive, successful assertions chained off of length", function () {
      for (const { obj, operator, len } of positiveSuccessCasesWithOperator) {
        describe(`with object ${obj} and operator "${operator}"`, function () {
          for (const convert of [
            (n: number) => n,
            ...numberToBigNumberConversions,
          ]) {
            const length = convert(len);
            describe(`with an operand of type ${typestr(length)}`, function () {
              for (const lenFunc of lengthFunctions) {
                it(`should work with .to.have.${lenFunc}.${operator}`, function () {
                  expect(obj).to.have[lenFunc][operator](length);
                });
              }
            });
          }
        });
      }
    });

    const negativeSuccessCasesWithOperator: SuccessCaseWithOperator[] = [
      { operator: "above", len: 3, obj: [1, 2, 3] },
      { operator: "above", len: 3, obj: new Set([1, 2, 3]) },
      {
        operator: "above",
        len: 3,
        obj: new Map([
          [1, 2],
          [3, 4],
          [5, 6],
        ]),
      },
      { operator: "below", len: 3, obj: [1, 2, 3] },
      { operator: "below", len: 3, obj: new Set([1, 2, 3]) },
      {
        operator: "below",
        len: 3,
        obj: new Map([
          [1, 2],
          [3, 4],
          [5, 6],
        ]),
      },
      { operator: "gt", len: 3, obj: [1, 2, 3] },
      { operator: "gt", len: 3, obj: new Set([1, 2, 3]) },
      {
        operator: "gt",
        len: 3,
        obj: new Map([
          [1, 2],
          [3, 4],
          [5, 6],
        ]),
      },
      { operator: "lt", len: 3, obj: [1, 2, 3] },
      { operator: "lt", len: 3, obj: new Set([1, 2, 3]) },
      {
        operator: "lt",
        len: 3,
        obj: new Map([
          [1, 2],
          [3, 4],
          [5, 6],
        ]),
      },
      { operator: "greaterThan", len: 3, obj: [1, 2, 3] },
      { operator: "greaterThan", len: 3, obj: new Set([1, 2, 3]) },
      {
        operator: "greaterThan",
        len: 3,
        obj: new Map([
          [1, 2],
          [3, 4],
          [5, 6],
        ]),
      },
      { operator: "lessThan", len: 3, obj: [1, 2, 3] },
      { operator: "lessThan", len: 3, obj: new Set([1, 2, 3]) },
      {
        operator: "lessThan",
        len: 3,
        obj: new Map([
          [1, 2],
          [3, 4],
          [5, 6],
        ]),
      },
      { operator: "least", len: 4, obj: [1, 2, 3] },
      { operator: "least", len: 4, obj: new Set([1, 2, 3]) },
      {
        operator: "least",
        len: 4,
        obj: new Map([
          [1, 2],
          [3, 4],
          [5, 6],
        ]),
      },
      { operator: "most", len: 2, obj: [1, 2, 3] },
      { operator: "most", len: 2, obj: new Set([1, 2, 3]) },
      {
        operator: "most",
        len: 2,
        obj: new Map([
          [1, 2],
          [3, 4],
          [5, 6],
        ]),
      },
      { operator: "gte", len: 4, obj: [1, 2, 3] },
      { operator: "gte", len: 4, obj: new Set([1, 2, 3]) },
      {
        operator: "gte",
        len: 4,
        obj: new Map([
          [1, 2],
          [3, 4],
          [5, 6],
        ]),
      },
      { operator: "lte", len: 2, obj: [1, 2, 3] },
      { operator: "lte", len: 2, obj: new Set([1, 2, 3]) },
      {
        operator: "lte",
        len: 2,
        obj: new Map([
          [1, 2],
          [3, 4],
          [5, 6],
        ]),
      },
      { operator: "greaterThanOrEqual", len: 4, obj: [1, 2, 3] },
      { operator: "greaterThanOrEqual", len: 4, obj: new Set([1, 2, 3]) },
      {
        operator: "greaterThanOrEqual",
        len: 4,
        obj: new Map([
          [1, 2],
          [3, 4],
          [5, 6],
        ]),
      },
      { operator: "lessThanOrEqual", len: 2, obj: [1, 2, 3] },
      { operator: "lessThanOrEqual", len: 2, obj: new Set([1, 2, 3]) },
      {
        operator: "lessThanOrEqual",
        len: 2,
        obj: new Map([
          [1, 2],
          [3, 4],
          [5, 6],
        ]),
      },
    ];
    describe("negative, successful assertions chained off of length", function () {
      for (const { obj, operator, len } of negativeSuccessCasesWithOperator) {
        describe(`with object ${obj} and operator "${operator}"`, function () {
          for (const convert of [
            (n: number) => n,
            ...numberToBigNumberConversions,
          ]) {
            const length = convert(len);
            describe(`with an operand of type ${typestr(length)}`, function () {
              for (const lenFunc of lengthFunctions) {
                it(`should work with .not.to.have.${lenFunc}.${operator}`, function () {
                  expect(obj).not.to.have[lenFunc][operator](length);
                });
              }
            });
          }
        });
      }
    });

    interface FailureCaseWithOperator extends SuccessCaseWithOperator {
      msg: string;
    }

    const positiveFailureCasesWithOperator: FailureCaseWithOperator[] = [
      {
        obj: [1, 2, 3],
        operator: "above",
        len: 3,
        msg: "expected [ 1, 2, 3 ] to have a length above 3 but got 3",
      },
      {
        obj: [1, 2, 3],
        operator: "below",
        len: 3,
        msg: "expected [ 1, 2, 3 ] to have a length below 3 but got 3",
      },
      {
        obj: [1, 2, 3],
        operator: "gt",
        len: 3,
        msg: "expected [ 1, 2, 3 ] to have a length above 3 but got 3",
      },
      {
        obj: [1, 2, 3],
        operator: "lt",
        len: 3,
        msg: "expected [ 1, 2, 3 ] to have a length below 3 but got 3",
      },
      {
        obj: [1, 2, 3],
        operator: "greaterThan",
        len: 3,
        msg: "expected [ 1, 2, 3 ] to have a length above 3 but got 3",
      },
      {
        obj: [1, 2, 3],
        operator: "lessThan",
        len: 3,
        msg: "expected [ 1, 2, 3 ] to have a length below 3 but got 3",
      },
      {
        obj: [1, 2, 3],
        operator: "least",
        len: 4,
        msg: "expected [ 1, 2, 3 ] to have a length at least 4 but got 3",
      },
      {
        obj: [1, 2, 3],
        operator: "most",
        len: 2,
        msg: "expected [ 1, 2, 3 ] to have a length at most 2 but got 3",
      },
      {
        obj: [1, 2, 3],
        operator: "gte",
        len: 4,
        msg: "expected [ 1, 2, 3 ] to have a length at least 4 but got 3",
      },
      {
        obj: [1, 2, 3],
        operator: "lte",
        len: 2,
        msg: "expected [ 1, 2, 3 ] to have a length at most 2 but got 3",
      },
      {
        obj: [1, 2, 3],
        operator: "greaterThanOrEqual",
        len: 4,
        msg: "expected [ 1, 2, 3 ] to have a length at least 4 but got 3",
      },
      {
        obj: [1, 2, 3],
        operator: "lessThanOrEqual",
        len: 2,
        msg: "expected [ 1, 2, 3 ] to have a length at most 2 but got 3",
      },
    ];
    describe("positive, failing assertions chained off of length should throw the proper error message", function () {
      for (const {
        obj,
        operator,
        len,
        msg,
      } of positiveFailureCasesWithOperator) {
        describe(`with object ${obj} and operator "${operator}"`, function () {
          for (const convert of [
            (n: number) => n,
            ...numberToBigNumberConversions,
          ]) {
            const length = convert(len);
            describe(`with an operand of type ${typestr(length)}`, function () {
              for (const lenFunc of lengthFunctions) {
                it(`should work with .to.have.${lenFunc}.${operator}`, function () {
                  expect(() =>
                    expect(obj).to.have[lenFunc][operator](length)
                  ).to.throw(AssertionError, msg);
                });
              }
            });
          }
        });
      }
    });
  });

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
            "HH17: The input value cannot be normalized to a BigInt: 1.1 is not an integer";
          it(`with .to.${operator} comparing float vs ${typestr(
            converted
          )}`, function () {
            expect(() => expect(1.1).to[operator](converted)).to.throw(
              HardhatError,
              msg
            );
          });
          it(`with .to.${operator} comparing ${typestr(
            converted
          )} vs float`, function () {
            expect(() => expect(converted).to[operator](1.1)).to.throw(
              HardhatError,
              msg
            );
          });
          it(`with .not.to.${operator} comparing float vs ${typestr(
            converted
          )}`, function () {
            expect(() => expect(1.1).not.to[operator](converted)).to.throw(
              HardhatError,
              msg
            );
          });
          it(`with .not.to.${operator} comparing ${typestr(
            converted
          )} vs float`, function () {
            expect(() => expect(converted).not.to[operator](1.1)).to.throw(
              HardhatError,
              msg
            );
          });
        }
      });

      describe("should throw when comparing to an unsafe integer", function () {
        const unsafeInt = 1e16;
        const msg = `HH17: The input value cannot be normalized to a BigInt: Integer 10000000000000000 is unsafe. Consider using ${unsafeInt}n instead. For more details, see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/isSafeInteger`;

        describe(`when using .to.${operator}`, function () {
          it("with an unsafe int as the first param", function () {
            expect(() => expect(unsafeInt).to[operator](1n)).to.throw(
              HardhatError,
              msg
            );
          });
          it("with an unsafe int as the second param", function () {
            expect(() => expect(1n).to[operator](unsafeInt)).to.throw(
              HardhatError,
              msg
            );
          });
        });

        describe(`when using .not.to.${operator}`, function () {
          it("with an unsafe int as the first param", function () {
            expect(() => expect(unsafeInt).not.to[operator](1n)).to.throw(
              HardhatError,
              msg
            );
          });
          it("with an unsafe int as the second param", function () {
            expect(() => expect(1n).not.to[operator](unsafeInt)).to.throw(
              HardhatError,
              msg
            );
          });
        });
      });
    });

    describe("deep equal", function () {
      checkAll(1, 1, (a, b) => {
        it(`should work with ${typestr(a)} and ${typestr(b)}`, function () {
          // successful assertions
          expect([a]).to.deep.equal([b]);
          expect([[a], [a]]).to.deep.equal([[b], [b]]);
          expect({ x: a }).to.deep.equal({ x: b });
          expect({ x: { y: a } }).to.deep.equal({ x: { y: b } });
          expect({ x: [a] }).to.deep.equal({ x: [b] });

          // failed assertions

          // We are not checking the content of the arrays/objects because
          // it depends on the type of the numbers (plain numbers, native
          // bigints)
          // Ideally the output would be normalized and we could check the
          // actual content more easily.

          expect(() => expect([a]).to.not.deep.equal([b])).to.throw(
            AssertionError,
            // the 's' modifier is used to make . match newlines too
            /expected \[.*\] to not deeply equal \[.*\]/s
          );
          expect(() =>
            expect([[a], [a]]).to.not.deep.equal([[b], [b]])
          ).to.throw(
            AssertionError,
            /expected \[.*\] to not deeply equal \[.*\]/s
          );
          expect(() => expect({ x: a }).to.not.deep.equal({ x: b })).to.throw(
            AssertionError,
            /expected \{.*\} to not deeply equal \{.*\}/s
          );
          expect(() =>
            expect({ x: { y: a } }).to.not.deep.equal({ x: { y: b } })
          ).to.throw(
            AssertionError,
            /expected \{.*\} to not deeply equal \{.*\}/s
          );
          expect(() =>
            expect({ x: [a] }).to.not.deep.equal({ x: [b] })
          ).to.throw(
            AssertionError,
            /expected \{.*\} to not deeply equal \{.*\}/s
          );
        });
      });

      checkAll(1, 2, (a, b) => {
        it(`should work with ${typestr(a)} and ${typestr(
          b
        )} (negative)`, function () {
          // successful assertions
          expect([a]).to.not.deep.equal([b]);
          expect([[a], [a]]).to.not.deep.equal([[b], [b]]);
          expect({ x: a }).to.not.deep.equal({ x: b });
          expect({ x: { y: a } }).to.not.deep.equal({ x: { y: b } });
          expect({ x: [a] }).to.not.deep.equal({ x: [b] });

          // failed assertions
          expect(() => expect([a]).to.deep.equal([b])).to.throw(
            AssertionError,
            // the 's' modifier is used to make . match newlines too
            /expected \[.*\] to deeply equal \[.*\]/s
          );
          expect(() => expect([[a], [a]]).to.deep.equal([[b], [b]])).to.throw(
            AssertionError,
            /expected \[.*\] to deeply equal \[.*\]/s
          );
          expect(() => expect({ x: a }).to.deep.equal({ x: b })).to.throw(
            AssertionError,
            /expected \{.*\} to deeply equal \{.*\}/s
          );
          expect(() =>
            expect({ x: { y: a } }).to.deep.equal({ x: { y: b } })
          ).to.throw(AssertionError, /expected \{.*\} to deeply equal \{.*\}/s);
          expect(() => expect({ x: [a] }).to.deep.equal({ x: [b] })).to.throw(
            AssertionError,
            /expected \{.*\} to deeply equal \{.*\}/s
          );
        });
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

    const operators = ["within", "closeTo", "approximately"] as const;
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
      { operator: "approximately", operands: [101, 101, 10] },
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
        msg: "expected 100 to be close to 111 +/- 10",
      },
      {
        operator: "approximately",
        operands: [100, 111, 10],
        msg: "expected 100 to be close to 111 +/- 10",
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

    const closeToAndApproximately: Operator[] = ["closeTo", "approximately"];
    for (const closeToOrApproximately of closeToAndApproximately) {
      describe(`${closeToOrApproximately} with an undefined delta argument`, function () {
        for (const convert of [
          (n: number) => n,
          ...numberToBigNumberConversions,
        ]) {
          const one = convert(1);
          it(`with a ${typestr(
            one
          )} actual should throw a helpful error message`, function () {
            expect(() =>
              expect(one).to.be[closeToOrApproximately](100, undefined)
            ).to.throw(
              AssertionError,
              "the arguments to closeTo or approximately must be numbers, and a delta is required"
            );
          });
        }
      });
    }

    const negativeSuccessCases: SuccessCase[] = [
      { operator: "within", operands: [100, 101, 102] },
      { operator: "within", operands: [100, 98, 99] },
      { operator: "closeTo", operands: [100, 111, 10] },
      { operator: "approximately", operands: [100, 111, 10] },
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
        msg: "expected 100 not to be close to 101 +/- 10",
      },
      {
        operator: "approximately",
        operands: [100, 101, 10],
        msg: "expected 100 not to be close to 101 +/- 10",
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
              "HH17: The input value cannot be normalized to a BigInt: 1.1 is not an integer";
            describe(`with .to.${operator}`, function () {
              it(`with float, ${typestr(a)}, ${typestr(a)}`, function () {
                expect(() => expect(1.1).to[operator](a, b)).to.throw(
                  HardhatError,
                  msg
                );
              });
              it(`with ${typestr(a)}, float, ${typestr(b)}`, function () {
                expect(() => expect(a).to[operator](1.1, b)).to.throw(
                  HardhatError,
                  msg
                );
              });
              it(`with ${typestr(a)}, ${typestr(b)}, float`, function () {
                expect(() => expect(a).to[operator](b, 1.1)).to.throw(
                  HardhatError,
                  msg
                );
              });
            });
            describe(`with not.to.${operator}`, function () {
              it(`with float, ${typestr(a)}, ${typestr(a)}`, function () {
                expect(() => expect(1.1).not.to[operator](a, b)).to.throw(
                  HardhatError,
                  msg
                );
              });
              it(`with ${typestr(a)}, float, ${typestr(b)}`, function () {
                expect(() => expect(a).not.to[operator](1.1, b)).to.throw(
                  HardhatError,
                  msg
                );
              });
              it(`with ${typestr(a)}, ${typestr(b)}, float`, function () {
                expect(() => expect(a).not.to[operator](b, 1.1)).to.throw(
                  HardhatError,
                  msg
                );
              });
            });
          }
        }
      });

      describe("should throw when comparing to an unsafe integer", function () {
        const unsafeInt = 1e16;
        const msg = `HH17: The input value cannot be normalized to a BigInt: Integer 10000000000000000 is unsafe. Consider using ${unsafeInt}n instead. For more details, see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/isSafeInteger`;

        describe(`when using .to.${operator}`, function () {
          it("with an unsafe int as the first param", function () {
            expect(() => expect(unsafeInt).to[operator](1n, 1n)).to.throw(
              HardhatError,
              msg
            );
          });
          it("with an unsafe int as the second param", function () {
            expect(() => expect(1n).to[operator](unsafeInt, 1n)).to.throw(
              HardhatError,
              msg
            );
          });
          it("with an unsafe int as the third param", function () {
            expect(() => expect(1n).to[operator](1n, unsafeInt)).to.throw(
              HardhatError,
              msg
            );
          });
        });

        describe(`when using not.to.${operator}`, function () {
          it("with an unsafe int as the first param", function () {
            expect(() => expect(unsafeInt).not.to[operator](1n, 1n)).to.throw(
              HardhatError,
              msg
            );
          });
          it("with an unsafe int as the second param", function () {
            expect(() => expect(1n).not.to[operator](unsafeInt, 1n)).to.throw(
              HardhatError,
              msg
            );
          });
          it("with an unsafe int as the third param", function () {
            expect(() => expect(1n).not.to[operator](1n, unsafeInt)).to.throw(
              HardhatError,
              msg
            );
          });
        });
      });
    });
  });

  it("custom message is preserved", function () {
    // normal numbers
    expect(() => expect(1).to.equal(2, "custom message")).to.throw(
      AssertionError,
      "custom message"
    );

    // number and bigint
    expect(() => expect(1).to.equal(2n, "custom message")).to.throw(
      AssertionError,
      "custom message"
    );

    // same but for deep comparisons
    expect(() => expect([1]).to.equal([2], "custom message")).to.throw(
      AssertionError,
      "custom message"
    );

    // number and bigint
    expect(() => expect([1]).to.equal([2n], "custom message")).to.throw(
      AssertionError,
      "custom message"
    );
  });
});
