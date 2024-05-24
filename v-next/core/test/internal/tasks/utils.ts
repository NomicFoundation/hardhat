import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  formatTaskId,
  isValidActionUrl,
  formatValue,
} from "../../../src/internal/tasks/utils.js";

describe("Task utils", () => {
  describe("formatTaskId", () => {
    it("should return the input if it is a string", () => {
      assert.equal(formatTaskId("foo"), "foo");
    });

    it("should return the input joined by a space if it is an array", () => {
      assert.equal(formatTaskId(["foo", "bar"]), "foo bar");
    });
  });

  describe("isValidActionUrl", () => {
    it("should return true if the action is a file URL", () => {
      assert.equal(isValidActionUrl("file://foo"), true);
    });

    it("should return false if the action is not a file URL", () => {
      assert.equal(isValidActionUrl("http://foo"), false);
      assert.equal(isValidActionUrl("file://"), false);
      assert.equal(isValidActionUrl("missing-protocol"), false);
    });
  });

  describe("formatValue", () => {
    it("should return the value as a string", () => {
      assert.equal(formatValue("foo"), '"foo"');
      assert.equal(formatValue(true), "true");
      assert.equal(formatValue(42), "42");
      assert.equal(formatValue(BigInt(42)), "42n");
      assert.equal(formatValue(3.14), "3.14");
    });
  });
});
