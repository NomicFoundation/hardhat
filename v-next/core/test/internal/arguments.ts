import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { ArgumentType } from "../../src/config.js";
import {
  isArgumentNameValid,
  isArgumentValueValid,
} from "../../src/internal/arguments.js";

describe("Arguments", () => {
  describe("isArgumentNameValid", () => {
    it("should return true for valid argument names", () => {
      assert.equal(isArgumentNameValid("a"), true);
      assert.equal(isArgumentNameValid("aa"), true);
      assert.equal(isArgumentNameValid("aA"), true);
      assert.equal(isArgumentNameValid("a1"), true);
      assert.equal(isArgumentNameValid("foo"), true);
      assert.equal(isArgumentNameValid("fooBar"), true);
      assert.equal(isArgumentNameValid("foo123"), true);
    });

    it("should return false for invalid argument names", () => {
      assert.equal(isArgumentNameValid("A"), false);
      assert.equal(isArgumentNameValid("1"), false);
      assert.equal(isArgumentNameValid("-"), false);
      assert.equal(isArgumentNameValid("Foo"), false);
      assert.equal(isArgumentNameValid("123Foo"), false);
      assert.equal(isArgumentNameValid("foo-bar"), false);
    });
  });

  describe("isArgumentValueValid", () => {
    it("should validate string arguments", () => {
      assert.equal(isArgumentValueValid(ArgumentType.STRING, "foo"), true);
      assert.equal(isArgumentValueValid(ArgumentType.STRING, 123), false);
    });

    it("should validate boolean arguments", () => {
      assert.equal(isArgumentValueValid(ArgumentType.BOOLEAN, true), true);
      assert.equal(isArgumentValueValid(ArgumentType.BOOLEAN, "true"), false);
    });

    it("should validate int arguments", () => {
      assert.equal(isArgumentValueValid(ArgumentType.INT, 123), true);
      assert.equal(isArgumentValueValid(ArgumentType.INT, 123.45), false);
      assert.equal(isArgumentValueValid(ArgumentType.INT, 123n), false);
    });

    it("should validate bigint arguments", () => {
      assert.equal(
        isArgumentValueValid(ArgumentType.BIGINT, BigInt(123)),
        true,
      );
      assert.equal(isArgumentValueValid(ArgumentType.BIGINT, 123n), true);
      assert.equal(isArgumentValueValid(ArgumentType.BIGINT, 123), false);
    });

    it("should validate float arguments", () => {
      assert.equal(isArgumentValueValid(ArgumentType.FLOAT, 123), true);
      assert.equal(isArgumentValueValid(ArgumentType.FLOAT, 123.45), true);
      assert.equal(isArgumentValueValid(ArgumentType.FLOAT, 123n), false);
    });

    it("should validate file arguments", () => {
      assert.equal(isArgumentValueValid(ArgumentType.FILE, "foo.txt"), true);
      assert.equal(
        isArgumentValueValid(ArgumentType.FILE, "random string"),
        true,
      );
      assert.equal(isArgumentValueValid(ArgumentType.FILE, 123), false);
    });

    it("should validate variadic arguments", () => {
      assert.equal(
        isArgumentValueValid(ArgumentType.STRING, ["foo", "bar"], true),
        true,
      );
      assert.equal(
        isArgumentValueValid(ArgumentType.BIGINT, [123n, BigInt(123)], true),
        true,
      );
      assert.equal(isArgumentValueValid(ArgumentType.STRING, [], true), false);
      assert.equal(
        isArgumentValueValid(ArgumentType.STRING, ["foo", 123], true),
        false,
      );
    });
  });
});
