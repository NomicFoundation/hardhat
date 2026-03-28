import { describe, it } from "node:test";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import { assertThrowsHardhatError } from "@nomicfoundation/hardhat-test-utils";

import {
  getFunctionFqn,
  validateInlineOverrides,
} from "../../../../../src/internal/builtin-plugins/solidity-test/inline-config/index.js";

import { makeRawOverride } from "./mocks.js";

describe("inline-config - validation", () => {
  describe("validateInlineOverrides", () => {
    it("should accept valid number key", () => {
      validateInlineOverrides([
        makeRawOverride({ key: "fuzz.runs", rawValue: "10" }),
      ]);
    });

    it("should accept valid boolean values", () => {
      validateInlineOverrides([
        makeRawOverride({ key: "fuzz.showLogs", rawValue: "true" }),
      ]);
      validateInlineOverrides([
        makeRawOverride({ key: "fuzz.showLogs", rawValue: "false" }),
      ]);
    });

    it("should throw INVALID_KEY for unknown key", () => {
      assertThrowsHardhatError(
        () =>
          validateInlineOverrides([
            makeRawOverride({
              key: "fuzz.nonexistent",
              rawValue: "5",
            }),
          ]),
        HardhatError.ERRORS.CORE.SOLIDITY_TESTS.INLINE_CONFIG_INVALID_KEY,
        {
          key: "fuzz.nonexistent",
          functionFqn: getFunctionFqn("test/MyTest.sol", "MyTest", "testFoo"),
          validKeys:
            "fuzz.runs, fuzz.maxTestRejects, fuzz.showLogs, fuzz.timeout, invariant.runs, invariant.depth, invariant.failOnRevert, invariant.callOverride, invariant.timeout, allowInternalExpectRevert",
        },
      );
    });

    it("should throw DUPLICATE_KEY for repeated key on same function", () => {
      assertThrowsHardhatError(
        () =>
          validateInlineOverrides([
            makeRawOverride({ key: "fuzz.runs", rawValue: "10" }),
            makeRawOverride({ key: "fuzz.runs", rawValue: "20" }),
          ]),
        HardhatError.ERRORS.CORE.SOLIDITY_TESTS.INLINE_CONFIG_DUPLICATE_KEY,
        {
          key: "fuzz.runs",
          functionFqn: getFunctionFqn("test/MyTest.sol", "MyTest", "testFoo"),
        },
      );
    });

    it("should throw INVALID_VALUE for non-numeric on number key", () => {
      assertThrowsHardhatError(
        () =>
          validateInlineOverrides([
            makeRawOverride({ key: "fuzz.runs", rawValue: "abc" }),
          ]),
        HardhatError.ERRORS.CORE.SOLIDITY_TESTS.INLINE_CONFIG_INVALID_VALUE,
        {
          value: "abc",
          key: "fuzz.runs",
          expectedType: "non-negative integer",
          functionFqn: getFunctionFqn("test/MyTest.sol", "MyTest", "testFoo"),
        },
      );
    });

    it("should throw INVALID_VALUE for negative number", () => {
      assertThrowsHardhatError(
        () =>
          validateInlineOverrides([
            makeRawOverride({ key: "fuzz.runs", rawValue: "-1" }),
          ]),
        HardhatError.ERRORS.CORE.SOLIDITY_TESTS.INLINE_CONFIG_INVALID_VALUE,
        {
          value: "-1",
          key: "fuzz.runs",
          expectedType: "non-negative integer",
          functionFqn: getFunctionFqn("test/MyTest.sol", "MyTest", "testFoo"),
        },
      );
    });

    it("should accept zero", () => {
      validateInlineOverrides([
        makeRawOverride({ key: "fuzz.runs", rawValue: "0" }),
      ]);
    });

    it("should throw INVALID_VALUE for float", () => {
      assertThrowsHardhatError(
        () =>
          validateInlineOverrides([
            makeRawOverride({ key: "fuzz.runs", rawValue: "1.5" }),
          ]),
        HardhatError.ERRORS.CORE.SOLIDITY_TESTS.INLINE_CONFIG_INVALID_VALUE,
        {
          value: "1.5",
          key: "fuzz.runs",
          expectedType: "non-negative integer",
          functionFqn: getFunctionFqn("test/MyTest.sol", "MyTest", "testFoo"),
        },
      );
    });

    it("should throw INVALID_VALUE for scientific notation", () => {
      assertThrowsHardhatError(
        () =>
          validateInlineOverrides([
            makeRawOverride({ key: "fuzz.runs", rawValue: "1e3" }),
          ]),
        HardhatError.ERRORS.CORE.SOLIDITY_TESTS.INLINE_CONFIG_INVALID_VALUE,
        {
          value: "1e3",
          key: "fuzz.runs",
          expectedType: "non-negative integer",
          functionFqn: getFunctionFqn("test/MyTest.sol", "MyTest", "testFoo"),
        },
      );
    });

    it("should throw INVALID_VALUE for hex literal", () => {
      assertThrowsHardhatError(
        () =>
          validateInlineOverrides([
            makeRawOverride({ key: "fuzz.runs", rawValue: "0x10" }),
          ]),
        HardhatError.ERRORS.CORE.SOLIDITY_TESTS.INLINE_CONFIG_INVALID_VALUE,
        {
          value: "0x10",
          key: "fuzz.runs",
          expectedType: "non-negative integer",
          functionFqn: getFunctionFqn("test/MyTest.sol", "MyTest", "testFoo"),
        },
      );
    });

    it("should throw INVALID_VALUE for leading zeros", () => {
      assertThrowsHardhatError(
        () =>
          validateInlineOverrides([
            makeRawOverride({ key: "fuzz.runs", rawValue: "007" }),
          ]),
        HardhatError.ERRORS.CORE.SOLIDITY_TESTS.INLINE_CONFIG_INVALID_VALUE,
        {
          value: "007",
          key: "fuzz.runs",
          expectedType: "non-negative integer",
          functionFqn: getFunctionFqn("test/MyTest.sol", "MyTest", "testFoo"),
        },
      );
    });

    it("should throw INVALID_VALUE for value beyond MAX_SAFE_INTEGER", () => {
      assertThrowsHardhatError(
        () =>
          validateInlineOverrides([
            makeRawOverride({
              key: "fuzz.runs",
              rawValue: "9007199254740992",
            }),
          ]),
        HardhatError.ERRORS.CORE.SOLIDITY_TESTS.INLINE_CONFIG_INVALID_VALUE,
        {
          value: "9007199254740992",
          key: "fuzz.runs",
          expectedType: "non-negative integer",
          functionFqn: getFunctionFqn("test/MyTest.sol", "MyTest", "testFoo"),
        },
      );
    });

    it("should throw INVALID_VALUE for non-boolean on boolean key", () => {
      assertThrowsHardhatError(
        () =>
          validateInlineOverrides([
            makeRawOverride({
              functionName: "invariantCheck",
              key: "invariant.failOnRevert",
              rawValue: "yes",
            }),
          ]),
        HardhatError.ERRORS.CORE.SOLIDITY_TESTS.INLINE_CONFIG_INVALID_VALUE,
        {
          value: "yes",
          key: "invariant.failOnRevert",
          expectedType: "boolean",
          functionFqn: getFunctionFqn(
            "test/MyTest.sol",
            "MyTest",
            "invariantCheck",
          ),
        },
      );
    });

    it("should throw INVALID_KEY_FOR_TEST_TYPE for invariant key on fuzz test", () => {
      assertThrowsHardhatError(
        () =>
          validateInlineOverrides([
            makeRawOverride({
              key: "invariant.runs",
              rawValue: "10",
            }),
          ]),
        HardhatError.ERRORS.CORE.SOLIDITY_TESTS
          .INLINE_CONFIG_INVALID_KEY_FOR_TEST_TYPE,
        {
          key: "invariant.runs",
          testType: "fuzz",
          validKeys:
            "fuzz.runs, fuzz.maxTestRejects, fuzz.showLogs, fuzz.timeout, allowInternalExpectRevert",
          functionFqn: getFunctionFqn("test/MyTest.sol", "MyTest", "testFoo"),
        },
      );
    });

    it("should throw INVALID_KEY_FOR_TEST_TYPE for fuzz key on invariant test", () => {
      assertThrowsHardhatError(
        () =>
          validateInlineOverrides([
            makeRawOverride({
              functionName: "invariantCheck",
              key: "fuzz.runs",
              rawValue: "10",
            }),
          ]),
        HardhatError.ERRORS.CORE.SOLIDITY_TESTS
          .INLINE_CONFIG_INVALID_KEY_FOR_TEST_TYPE,
        {
          key: "fuzz.runs",
          testType: "invariant",
          validKeys:
            "invariant.runs, invariant.depth, invariant.failOnRevert, invariant.callOverride, invariant.timeout, allowInternalExpectRevert",
          functionFqn: getFunctionFqn(
            "test/MyTest.sol",
            "MyTest",
            "invariantCheck",
          ),
        },
      );
    });

    it("should accept top-level key on fuzz test", () => {
      validateInlineOverrides([
        makeRawOverride({
          key: "allowInternalExpectRevert",
          rawValue: "true",
        }),
      ]);
    });

    it("should accept top-level key on invariant test", () => {
      validateInlineOverrides([
        makeRawOverride({
          functionName: "invariantCheck",
          key: "allowInternalExpectRevert",
          rawValue: "true",
        }),
      ]);
    });

    it("should accept invariant key on invariant test", () => {
      validateInlineOverrides([
        makeRawOverride({
          functionName: "invariantCheck",
          key: "invariant.runs",
          rawValue: "10",
        }),
      ]);
    });
  });
});
