import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { ArgumentType } from "../../src/config.js";
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
      assert.equal(isParameterValueValid(ArgumentType.STRING, "foo"), true);
      assert.equal(isParameterValueValid(ArgumentType.STRING, 123), false);
    });

    it("should validate boolean parameters", () => {
      assert.equal(isParameterValueValid(ArgumentType.BOOLEAN, true), true);
      assert.equal(isParameterValueValid(ArgumentType.BOOLEAN, "true"), false);
    });

    it("should validate int parameters", () => {
      assert.equal(isParameterValueValid(ArgumentType.INT, 123), true);
      assert.equal(isParameterValueValid(ArgumentType.INT, 123.45), false);
      assert.equal(isParameterValueValid(ArgumentType.INT, 123n), false);
    });

    it("should validate bigint parameters", () => {
      assert.equal(
        isParameterValueValid(ArgumentType.BIGINT, BigInt(123)),
        true,
      );
      assert.equal(isParameterValueValid(ArgumentType.BIGINT, 123n), true);
      assert.equal(isParameterValueValid(ArgumentType.BIGINT, 123), false);
    });

    it("should validate float parameters", () => {
      assert.equal(isParameterValueValid(ArgumentType.FLOAT, 123), true);
      assert.equal(isParameterValueValid(ArgumentType.FLOAT, 123.45), true);
      assert.equal(isParameterValueValid(ArgumentType.FLOAT, 123n), false);
    });

    it("should validate file parameters", () => {
      assert.equal(isParameterValueValid(ArgumentType.FILE, "foo.txt"), true);
      assert.equal(
        isParameterValueValid(ArgumentType.FILE, "random string"),
        true,
      );
      assert.equal(isParameterValueValid(ArgumentType.FILE, 123), false);
    });

    it("should validate variadic parameters", () => {
      assert.equal(
        isParameterValueValid(ArgumentType.STRING, ["foo", "bar"], true),
        true,
      );
      assert.equal(
        isParameterValueValid(ArgumentType.BIGINT, [123n, BigInt(123)], true),
        true,
      );
      assert.equal(isParameterValueValid(ArgumentType.STRING, [], true), false);
      assert.equal(
        isParameterValueValid(ArgumentType.STRING, ["foo", 123], true),
        false,
      );
    });
  });
});
