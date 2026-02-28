import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  successResult,
  errorResult,
  isResult,
} from "../../src/utils/result.js";

describe("result", function () {
  describe("successResult", function () {
    it("should create a successful Result with the given value", function () {
      const result = successResult(42);
      assert.deepEqual(result, { success: true, value: 42 });
    });

    it("should create a successful Result without a value when called with no arguments", function () {
      const result = successResult();
      assert.deepEqual(result, { success: true, value: undefined });
    });

    it("should be recognized by isResult", function () {
      assert.equal(isResult(successResult("hello")), true);
    });
  });

  describe("errorResult", function () {
    it("should create a failed Result with the given error", function () {
      const result = errorResult("something went wrong");
      assert.deepEqual(result, {
        success: false,
        error: "something went wrong",
      });
    });

    it("should create a failed Result without an error when called with no arguments", function () {
      const result = errorResult();
      assert.deepEqual(result, { success: false, error: undefined });
    });

    it("should be recognized by isResult", function () {
      assert.equal(isResult(errorResult()), true);
    });

    it("should be recognized by isResult when called with an error", function () {
      assert.equal(isResult(errorResult("error details")), true);
    });
  });

  describe("isResult", function () {
    it("should return true for a successful Result", function () {
      assert.equal(isResult({ success: true, value: 42 }), true);
    });

    it("should return true for a failed Result", function () {
      assert.equal(isResult({ success: false, error: "oops" }), true);
    });

    it("should return true for a successful Result without a value", function () {
      assert.equal(isResult({ success: true }), true);
    });

    it("should return true for a failed Result without an error", function () {
      assert.equal(isResult({ success: false }), true);
    });

    it("should return false for undefined", function () {
      assert.equal(isResult(undefined), false);
    });

    it("should return false for null", function () {
      assert.equal(isResult(null), false);
    });

    it("should return false for a plain object without success", function () {
      assert.equal(isResult({ value: 42 }), false);
    });

    it("should return false for a string", function () {
      assert.equal(isResult("hello"), false);
    });

    it("should return false for a number", function () {
      assert.equal(isResult(123), false);
    });

    it("should return false for an object with non-boolean success", function () {
      assert.equal(isResult({ success: "yes" }), false);
    });

    it("should return false for an array", function () {
      assert.equal(isResult([1, 2, 3]), false);
    });

    it("should validate the value field with a type guard", function () {
      const isString = (v: unknown): v is string => typeof v === "string";
      assert.equal(isResult({ success: true, value: "hello" }, isString), true);
      assert.equal(isResult({ success: true, value: 42 }, isString), false);
    });

    it("should validate the error field with a type guard", function () {
      const isString = (v: unknown): v is string => typeof v === "string";
      assert.equal(
        isResult({ success: false, error: "oops" }, undefined, isString),
        true,
      );
      assert.equal(
        isResult({ success: false, error: 42 }, undefined, isString),
        false,
      );
    });

    it("should validate both value and error with type guards", function () {
      const isNumber = (v: unknown): v is number => typeof v === "number";
      const isString = (v: unknown): v is string => typeof v === "string";
      assert.equal(
        isResult({ success: true, value: 42 }, isNumber, isString),
        true,
      );
      assert.equal(
        isResult({ success: false, error: "oops" }, isNumber, isString),
        true,
      );
    });

    it("should not apply the error guard on a successful result", function () {
      const isString = (v: unknown): v is string => typeof v === "string";
      assert.equal(
        isResult({ success: true, value: 42 }, undefined, isString),
        true,
      );
    });

    it("should not apply the value guard on a failed result", function () {
      const isString = (v: unknown): v is string => typeof v === "string";
      assert.equal(isResult({ success: false, error: 42 }, isString), true);
    });
  });
});
