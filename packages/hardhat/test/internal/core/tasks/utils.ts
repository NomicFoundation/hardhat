import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { formatTaskId } from "../../../../src/internal/core/tasks/utils.js";

describe("Task utils", () => {
  describe("formatTaskId", () => {
    it("should return the input if it is a string", () => {
      assert.equal(formatTaskId("foo"), "foo");
    });

    it("should return the input joined by a space if it is an array", () => {
      assert.equal(formatTaskId(["foo", "bar"]), "foo bar");
    });
  });
});
