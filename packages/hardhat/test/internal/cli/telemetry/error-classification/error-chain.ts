import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { getErrorChain } from "../../../../../src/internal/cli/telemetry/error-classification/helpers.js";

describe("getErrorChain", () => {
  it("returns the error and its causes, outer to inner", () => {
    const innermost = new Error("innermost");
    const middle = new Error("middle", { cause: innermost });
    const outer = new Error("outer", { cause: middle });

    assert.deepEqual(getErrorChain(outer), [outer, middle, innermost]);
  });

  it("returns a single entry for an error without a cause", () => {
    const error = new Error("alone");

    assert.deepEqual(getErrorChain(error), [error]);
  });

  it("stops at a cause that isn't an Error", () => {
    const error = new Error("outer", { cause: "just a string" });

    assert.deepEqual(getErrorChain(error), [error]);
  });

  // Without the cycle guard this loops forever, which would hang the CLI while
  // it is deciding how to display an error.
  it("terminates on a cyclic cause chain", () => {
    const first = new Error("first");
    const second = new Error("second", { cause: first });
    first.cause = second;

    assert.deepEqual(getErrorChain(first), [first, second]);
  });

  it("stops at maxCauseDepth", () => {
    let error = new Error("0");
    for (let i = 1; i < 20; i++) {
      error = new Error(`${i}`, { cause: error });
    }

    assert.equal(getErrorChain(error).length, 10);
    assert.equal(getErrorChain(error, 3).length, 3);
  });
});
