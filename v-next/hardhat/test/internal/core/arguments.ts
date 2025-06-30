import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import { assertThrowsHardhatError } from "@nomicfoundation/hardhat-test-utils";

import {
  isArgumentNameValid,
  isArgumentValueValid,
  parseArgumentValue,
} from "../../../src/internal/core/arguments.js";
import { ArgumentType } from "../../../src/types/arguments.js";

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
      assert.equal(isArgumentValueValid(ArgumentType.STRING, [], true), true);
      assert.equal(
        isArgumentValueValid(ArgumentType.STRING, ["foo", 123], true),
        false,
      );
    });

    it("should validate flag arguments", () => {
      assert.equal(isArgumentValueValid(ArgumentType.FLAG, true), true);
      assert.equal(isArgumentValueValid(ArgumentType.FLAG, false), true);
      assert.equal(isArgumentValueValid(ArgumentType.FLAG, 0), false);
      assert.equal(isArgumentValueValid(ArgumentType.FLAG, 1), false);
      assert.equal(isArgumentValueValid(ArgumentType.FLAG, "true"), false);
      assert.equal(isArgumentValueValid(ArgumentType.FLAG, "false"), false);
      assert.equal(isArgumentValueValid(ArgumentType.FLAG, "0"), false);
      assert.equal(isArgumentValueValid(ArgumentType.FLAG, "1"), false);
    });

    it("should validate level arguments", () => {
      assert.equal(isArgumentValueValid(ArgumentType.LEVEL, true), false);
      assert.equal(isArgumentValueValid(ArgumentType.LEVEL, false), false);
      assert.equal(isArgumentValueValid(ArgumentType.LEVEL, -1), false);
      assert.equal(isArgumentValueValid(ArgumentType.LEVEL, 0), true);
      assert.equal(isArgumentValueValid(ArgumentType.LEVEL, 1), true);
      assert.equal(isArgumentValueValid(ArgumentType.LEVEL, 2), true);
      assert.equal(isArgumentValueValid(ArgumentType.LEVEL, 3), true);
      assert.equal(isArgumentValueValid(ArgumentType.LEVEL, 4), true);
      assert.equal(isArgumentValueValid(ArgumentType.LEVEL, "true"), false);
      assert.equal(isArgumentValueValid(ArgumentType.LEVEL, "false"), false);
      assert.equal(isArgumentValueValid(ArgumentType.LEVEL, "-1"), false);
      assert.equal(isArgumentValueValid(ArgumentType.LEVEL, "0"), false);
      assert.equal(isArgumentValueValid(ArgumentType.LEVEL, "1"), false);
      assert.equal(isArgumentValueValid(ArgumentType.LEVEL, "2"), false);
      assert.equal(isArgumentValueValid(ArgumentType.LEVEL, "3"), false);
      assert.equal(isArgumentValueValid(ArgumentType.LEVEL, "4"), false);
    });
  });

  describe("parseArgumentValue", () => {
    it("should parse string arguments", () => {
      assert.equal(
        parseArgumentValue("foo", ArgumentType.STRING, "name"),
        "foo",
      );
    });

    it("should parse file arguments", () => {
      assert.equal(
        parseArgumentValue("foo.txt", ArgumentType.FILE, "name"),
        "foo.txt",
      );
    });

    it("should parse int arguments", () => {
      assert.equal(parseArgumentValue("123", ArgumentType.INT, "name"), 123);
    });

    it("should parse float arguments", () => {
      assert.equal(
        parseArgumentValue("123.45", ArgumentType.FLOAT, "name"),
        123.45,
      );
    });

    it("should parse bigint arguments", () => {
      assert.equal(
        parseArgumentValue("123", ArgumentType.BIGINT, "name"),
        BigInt(123),
      );
    });

    it("should parse boolean arguments", () => {
      assert.equal(
        parseArgumentValue("true", ArgumentType.BOOLEAN, "name"),
        true,
      );
    });

    it("should parse flag arguments", () => {
      assert.equal(parseArgumentValue("true", ArgumentType.FLAG, "name"), true);
    });

    it("should parse level arguments", () => {
      assert.equal(parseArgumentValue("1", ArgumentType.LEVEL, "name"), 1);
    });

    describe("should throw an error for invalid values", () => {
      it("for int arguments", () => {
        assertThrowsHardhatError(
          () => {
            parseArgumentValue("foo", ArgumentType.INT, "name");
          },
          HardhatError.ERRORS.CORE.ARGUMENTS.INVALID_VALUE_FOR_TYPE,
          { value: "foo", name: "name", type: ArgumentType.INT },
        );
      });

      it("for float arguments", () => {
        assertThrowsHardhatError(
          () => {
            parseArgumentValue("foo", ArgumentType.FLOAT, "name");
          },
          HardhatError.ERRORS.CORE.ARGUMENTS.INVALID_VALUE_FOR_TYPE,
          { value: "foo", name: "name", type: ArgumentType.FLOAT },
        );
      });

      it("for bigint arguments", () => {
        assertThrowsHardhatError(
          () => {
            parseArgumentValue("foo", ArgumentType.BIGINT, "name");
          },
          HardhatError.ERRORS.CORE.ARGUMENTS.INVALID_VALUE_FOR_TYPE,
          { value: "foo", name: "name", type: ArgumentType.BIGINT },
        );
      });

      it("for boolean arguments", () => {
        assertThrowsHardhatError(
          () => {
            parseArgumentValue("foo", ArgumentType.BOOLEAN, "name");
          },
          HardhatError.ERRORS.CORE.ARGUMENTS.INVALID_VALUE_FOR_TYPE,
          { value: "foo", name: "name", type: ArgumentType.BOOLEAN },
        );
      });

      it("for flag arguments", () => {
        assertThrowsHardhatError(
          () => {
            parseArgumentValue("foo", ArgumentType.FLAG, "name");
          },
          HardhatError.ERRORS.CORE.ARGUMENTS.INVALID_VALUE_FOR_TYPE,
          { value: "foo", name: "name", type: ArgumentType.FLAG },
        );
      });

      it("for level arguments", () => {
        assertThrowsHardhatError(
          () => {
            parseArgumentValue("foo", ArgumentType.LEVEL, "name");
          },
          HardhatError.ERRORS.CORE.ARGUMENTS.INVALID_VALUE_FOR_TYPE,
          { value: "foo", name: "name", type: ArgumentType.LEVEL },
        );
      });
    });
  });
});
