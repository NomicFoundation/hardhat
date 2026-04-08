import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { CustomError } from "../src/error.js";

describe("CustomError", () => {
  class MockCustomError extends CustomError {}

  it("should not set the `cause` property to `undefined` if not provided", () => {
    const error = new MockCustomError("test");

    assert.ok(!("cause" in error), "The `cause` property shouldn't be present");
  });

  it("should set the `cause` property to if provided", () => {
    const cause = new Error("cause");
    const error = new MockCustomError("test", cause);

    assert.equal(
      error.cause,
      error.cause,
      "The `cause` property should be set to the provided error",
    );
  });
});
