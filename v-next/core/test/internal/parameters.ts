import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { ParameterType } from "../../src/config.js";
import {
  isValidParamNameCasing,
  isParameterValueValid,
} from "../../src/internal/parameters.js";

describe("Parameters", () => {
  describe("isValidParamNameCasing", () => {
    it("should return true for valid parameter names", () => {
      assert.equal(isValidParamNameCasing("a"), true);
      assert.equal(isValidParamNameCasing("aa"), true);
      assert.equal(isValidParamNameCasing("aA"), true);
      assert.equal(isValidParamNameCasing("a1"), true);
      assert.equal(isValidParamNameCasing("foo"), true);
      assert.equal(isValidParamNameCasing("fooBar"), true);
      assert.equal(isValidParamNameCasing("foo123"), true);
    });

    it("should return false for invalid parameter names", () => {
      assert.equal(isValidParamNameCasing("A"), false);
      assert.equal(isValidParamNameCasing("1"), false);
      assert.equal(isValidParamNameCasing("-"), false);
      assert.equal(isValidParamNameCasing("Foo"), false);
      assert.equal(isValidParamNameCasing("123Foo"), false);
      assert.equal(isValidParamNameCasing("foo-bar"), false);
    });
  });

  describe("isParameterValueValid", () => {
    it("should validate string parameters", () => {
      assert.equal(isParameterValueValid(ParameterType.STRING, "foo"), true);
      assert.equal(isParameterValueValid(ParameterType.STRING, 123), false);
    });

    it("should validate boolean parameters", () => {
      assert.equal(isParameterValueValid(ParameterType.BOOLEAN, true), true);
      assert.equal(isParameterValueValid(ParameterType.BOOLEAN, "true"), false);
    });

    it("should validate int parameters", () => {
      assert.equal(isParameterValueValid(ParameterType.INT, 123), true);
      assert.equal(isParameterValueValid(ParameterType.INT, 123.45), false);
      assert.equal(isParameterValueValid(ParameterType.INT, 123n), false);
    });

    it("should validate bigint parameters", () => {
      assert.equal(
        isParameterValueValid(ParameterType.BIGINT, BigInt(123)),
        true,
      );
      assert.equal(isParameterValueValid(ParameterType.BIGINT, 123n), true);
      assert.equal(isParameterValueValid(ParameterType.BIGINT, 123), false);
    });

    it("should validate float parameters", () => {
      assert.equal(isParameterValueValid(ParameterType.FLOAT, 123), true);
      assert.equal(isParameterValueValid(ParameterType.FLOAT, 123.45), true);
      assert.equal(isParameterValueValid(ParameterType.FLOAT, 123n), false);
    });

    it("should validate file parameters", () => {
      assert.equal(isParameterValueValid(ParameterType.FILE, "foo.txt"), true);
      assert.equal(
        isParameterValueValid(ParameterType.FILE, "random string"),
        true,
      );
      assert.equal(isParameterValueValid(ParameterType.FILE, 123), false);
    });

    it("should validate variadic parameters", () => {
      assert.equal(
        isParameterValueValid(ParameterType.STRING, ["foo", "bar"], true),
        true,
      );
      assert.equal(
        isParameterValueValid(ParameterType.BIGINT, [123n, BigInt(123)], true),
        true,
      );
      assert.equal(
        isParameterValueValid(ParameterType.STRING, [], true),
        false,
      );
      assert.equal(
        isParameterValueValid(ParameterType.STRING, ["foo", 123], true),
        false,
      );
    });
  });
});
