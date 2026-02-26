import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  isTaskResult,
  taskSuccess,
  taskFailure,
} from "../../src/utils/task-result.js";

describe("task-result", function () {
  describe("isTaskResult", function () {
    it("should return true for a successful TaskResult", function () {
      assert.equal(isTaskResult({ success: true, value: 42 }), true);
    });

    it("should return true for a failed TaskResult", function () {
      assert.equal(isTaskResult({ success: false }), true);
    });

    it("should return false for undefined", function () {
      assert.equal(isTaskResult(undefined), false);
    });

    it("should return false for null", function () {
      assert.equal(isTaskResult(null), false);
    });

    it("should return false for a plain object without success", function () {
      assert.equal(isTaskResult({ value: 42 }), false);
    });

    it("should return false for a string", function () {
      assert.equal(isTaskResult("hello"), false);
    });

    it("should return false for a number", function () {
      assert.equal(isTaskResult(123), false);
    });

    it("should return false for an object with non-boolean success", function () {
      assert.equal(isTaskResult({ success: "yes" }), false);
    });

    it("should return false for an array", function () {
      assert.equal(isTaskResult([1, 2, 3]), false);
    });
  });

  describe("taskSuccess", function () {
    it("should create a successful TaskResult with the given value", function () {
      const result = taskSuccess(42);
      assert.deepEqual(result, { success: true, value: 42 });
    });

    it("should be recognized by isTaskResult", function () {
      assert.equal(isTaskResult(taskSuccess("hello")), true);
    });
  });

  describe("taskFailure", function () {
    it("should create a failed TaskResult", function () {
      const result = taskFailure();
      assert.deepEqual(result, { success: false });
    });

    it("should be recognized by isTaskResult", function () {
      assert.equal(isTaskResult(taskFailure()), true);
    });
  });
});
