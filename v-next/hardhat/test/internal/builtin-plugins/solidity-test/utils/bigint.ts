import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  bigIntAbs,
  bigIntDiv,
  bigIntFromNumber,
  bigIntPadEnd,
  bigIntToString,
} from "../../../../../src/internal/builtin-plugins/solidity-test/utils/bigint.js";

describe("bigint", () => {
  describe("bigIntPadEnd", () => {
    it("should pad the value with zeros", () => {
      const value = BigInt(123);
      const precision = 3;
      const expected = BigInt(123000);

      const actual = bigIntPadEnd(value, precision);

      assert.equal(actual, expected);
    });
  });

  describe("bigIntDiv", () => {
    it("should divide two numbers", () => {
      const value = BigInt(6);
      const previousValue = BigInt(3);
      const precision = 0;
      const expected = BigInt(2);

      const actual = bigIntDiv(value, previousValue, precision);

      assert.equal(actual, expected);
    });

    it("should round the result to the floor", () => {
      const value = BigInt(9);
      const previousValue = BigInt(2);
      const precision = 0;
      const expected = BigInt(4);

      const actual = bigIntDiv(value, previousValue, precision);

      assert.equal(actual, expected);
    });

    it("should use the right-most digits as the precision offset", () => {
      const value = BigInt(9);
      const previousValue = BigInt(2);
      const precision = 2;
      const expected = BigInt(450);

      const actual = bigIntDiv(value, previousValue, precision);

      assert.equal(actual, expected);
    });
  });

  describe("bigIntAbs", () => {
    it("should return the absolute value of a number", () => {
      const value = BigInt(-123);
      const expected = BigInt(123);

      const actual = bigIntAbs(value);

      assert.equal(actual, expected);
    });

    it("should return the same number if it's already positive", () => {
      const value = BigInt(123);
      const expected = BigInt(123);

      const actual = bigIntAbs(value);

      assert.equal(actual, expected);
    });
  });

  describe("bigIntFromNumber", () => {
    it("should convert a number to a bigint", () => {
      const value = 123.456789;
      const precision = 3;
      const expected = BigInt(123457);

      const actual = bigIntFromNumber(value, precision);

      assert.equal(actual, expected);
    });
  });

  describe("bigIntToString", () => {
    it("should convert a bigint to a string", () => {
      const value = BigInt(123456);
      const precision = 3;
      const signed = true;
      const expected = "+123.456";

      const actual = bigIntToString(value, precision, signed);

      assert.equal(actual, expected);
    });

    it("should convert a negative bigint to a string", () => {
      const value = BigInt(-123456);
      const precision = 3;
      const signed = true;
      const expected = "-123.456";

      const actual = bigIntToString(value, precision, signed);

      assert.equal(actual, expected);
    });

    it("should convert a fractional bigint to a string", () => {
      const value = BigInt(1);
      const precision = 3;
      const signed = true;
      const expected = "+0.001";

      const actual = bigIntToString(value, precision, signed);

      assert.equal(actual, expected);
    });

    it("should convert a negative fractional bigint to a string", () => {
      const value = BigInt(-1);
      const precision = 3;
      const signed = true;
      const expected = "-0.001";

      const actual = bigIntToString(value, precision, signed);

      assert.equal(actual, expected);
    });
  });
});
