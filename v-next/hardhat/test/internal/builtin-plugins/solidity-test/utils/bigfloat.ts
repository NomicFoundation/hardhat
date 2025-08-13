import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { BigFloat } from "../../../../../src/internal/builtin-plugins/solidity-test/utils/bigfloat.js";

describe("BigFloat", () => {
  describe("construction and parsing", () => {
    it("should construct from simple string", () => {
      const bf = BigFloat.fromString("123");
      assert.equal(bf.toString(), "123");
    });

    it("should construct from string with decimals", () => {
      const bf = BigFloat.fromString("123.456");
      assert.equal(bf.toString(), "123.456");
    });

    it("should construct from negative string", () => {
      const bf = BigFloat.fromString("-123.456");
      assert.equal(bf.toString(), "-123.456");
    });

    it("should construct from positive string with sign", () => {
      const bf = BigFloat.fromString("+123.456");
      assert.equal(bf.toString(true), "+123.456");
    });

    it("should normalize trailing zeros", () => {
      const bf = new BigFloat(123000n, -5); // equivalent to 1.23
      assert.equal(bf.toString(), "1.23");
    });

    it("should construct from number", () => {
      const bf = BigFloat.fromNumber(1.2345);
      assert.equal(bf.toString(), "1.2345");
    });

    it("should construct from bigint", () => {
      const bf = BigFloat.fromBigInt(123n);
      assert.equal(bf.toString(), "123");
    });
  });

  describe("arithmetic operations", () => {
    it("should add numbers with different exponents", () => {
      const a = BigFloat.fromString("1.2");
      const b = BigFloat.fromString("0.345");
      assert.equal(a.add(b).toString(), "1.545");
    });

    it("should subtract correctly", () => {
      const a = BigFloat.fromString("5.67");
      const b = BigFloat.fromString("2.34");
      assert.equal(a.sub(b).toString(), "3.33");
    });

    it("should multiply correctly", () => {
      const a = BigFloat.fromString("2.5");
      const b = BigFloat.fromString("4");
      assert.equal(a.mul(b).toString(), "10");
    });

    it("should divide correctly with default precision", () => {
      const a = BigFloat.fromString("1");
      const b = BigFloat.fromString("3");
      const result = a.div(b);
      assert.equal(result.toString(), "0.333333333333333333");
    });

    it("should divide correctly with custom precision", () => {
      const a = BigFloat.fromString("1");
      const b = BigFloat.fromString("8");
      assert.equal(a.div(b, 5).toString(), "0.125");
    });

    it("should handle negative arithmetic", () => {
      const a = BigFloat.fromString("-2");
      const b = BigFloat.fromString("3");
      assert.equal(a.add(b).toString(), "1");
      assert.equal(a.sub(b).toString(), "-5");
      assert.equal(a.mul(b).toString(), "-6");
      assert.equal(a.div(b).toFixed(3), "-0.667");
    });

    it("should not mutate operands during arithmetic", () => {
      const a = BigFloat.fromString("2");
      const b = BigFloat.fromString("3");
      const sum = a.add(b);
      assert.equal(a.toString(), "2");
      assert.equal(b.toString(), "3");
      assert.equal(sum.toString(), "5");
    });
  });

  describe("comparisons", () => {
    const a = BigFloat.fromString("1.23");
    const b = BigFloat.fromString("1.2300");
    const c = BigFloat.fromString("2.34");

    it("should detect equals correctly with different exponents", () => {
      assert.equal(a.equals(b), true);
    });

    it("should compare greater/less correctly", () => {
      assert.equal(c.greaterThan(a), true);
      assert.equal(a.lessThan(c), true);
      assert.equal(c.greaterThanOrEqual(a), true);
      assert.equal(a.lessThanOrEqual(b), true);
    });

    it("should handle negative comparisons", () => {
      const neg = BigFloat.fromString("-1.23");
      assert.equal(neg.lessThan(BigFloat.fromString("0")), true);
      assert.equal(neg.lessThan(BigFloat.fromString("-1.22")), true);
    });
  });

  describe("toString formatting", () => {
    it("should omit sign by default", () => {
      const bf = BigFloat.fromString("123.45");
      assert.equal(bf.toString(), "123.45");
    });

    it("should include sign when requested", () => {
      const bf = BigFloat.fromString("123.45");
      assert.equal(bf.toString(true), "+123.45");
    });

    it("should handle negative zero", () => {
      const bf = BigFloat.fromString("-0.000");
      assert.equal(bf.toString(), "0");
      assert.equal(bf.toString(true), "0");
    });

    it("should handle integers", () => {
      const bf = BigFloat.fromString("42");
      assert.equal(bf.toString(), "42");
    });

    it("should not preserve fractional zeros", () => {
      const bf = BigFloat.fromString("0.0500");
      assert.equal(bf.toString(), "0.05");
    });

    it("should handle very large positive exponents", () => {
      const bf = new BigFloat(123n, 5); // 123 * 10^5 = 12300000
      assert.equal(bf.toString(), "12300000");
    });

    it("should handle very small negative exponents", () => {
      const bf = BigFloat.fromString("0.000000000000000001");
      assert.equal(bf.toString(), "0.000000000000000001");
    });
  });

  describe("toFixed formatting", () => {
    it("should round correctly (positive)", () => {
      const bf = BigFloat.fromString("0.050289");
      assert.equal(bf.toFixed(3), "0.050");
    });

    it("should round correctly (negative)", () => {
      const bf = BigFloat.fromString("-0.050289");
      assert.equal(bf.toFixed(3), "-0.050");
    });

    it("should preserve negative zero", () => {
      const bf = BigFloat.fromString("-0.000016");
      assert.equal(bf.toFixed(3), "-0.000");
    });

    it("should pad zeros if fewer fractional digits", () => {
      const bf = BigFloat.fromString("1.2");
      assert.equal(bf.toFixed(3), "1.200");
    });

    it("should truncate and round extra fractional digits", () => {
      const bf = BigFloat.fromString("1.23456789");
      assert.equal(bf.toFixed(4), "1.2346");
    });

    it("should handle toFixed(0) rounding correctly", () => {
      assert.equal(BigFloat.fromString("0.5").toFixed(0), "1");
      assert.equal(BigFloat.fromString("-0.5").toFixed(0), "-1");
    });

    it("should handle signed output", () => {
      assert.equal(BigFloat.fromString("1.23").toFixed(2, true), "+1.23");
      assert.equal(BigFloat.fromString("-1.23").toFixed(2, true), "-1.23");
    });

    it("should handle integers with toFixed", () => {
      assert.equal(BigFloat.fromString("42").toFixed(2), "42.00");
    });

    it("should handle zero with toFixed", () => {
      assert.equal(BigFloat.fromString("0").toFixed(2), "0.00");
    });
  });

  describe("edge cases", () => {
    it("should handle very large numbers", () => {
      const bf = BigFloat.fromString("123456789123456789");
      assert.equal(bf.toString(), "123456789123456789");
    });

    it("should handle very small numbers (no scientific notation)", () => {
      const bf = BigFloat.fromString("0.000000000000000001");
      assert.equal(bf.toString(), "0.000000000000000001");
    });

    it("should handle addition near zero crossing", () => {
      const a = BigFloat.fromString("0.0001");
      const b = BigFloat.fromString("-0.0001");
      assert.equal(a.add(b).toString(), "0");
    });

    it("should handle subtraction resulting in negative near zero", () => {
      const a = BigFloat.fromString("0.0001");
      const b = BigFloat.fromString("0.0002");
      assert.equal(a.sub(b).toString(), "-0.0001");
    });
  });
});
