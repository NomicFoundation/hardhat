import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { expectTypeOf } from "expect-type";

import { getCurrentStack } from "../src/stack.js";

describe("stack", () => {
  describe("getCurrentStack", () => {
    it("Should return the current stack as an array of NodeJS.CallSite", () => {
      const stack = getCurrentStack();

      assert(stack.length > 0);
      expectTypeOf(stack).toEqualTypeOf<NodeJS.CallSite[]>();
    });

    it("Should restore the stack to its original state after calling it", () => {
      const originalPrepareStackTrace = Error.prepareStackTrace;

      getCurrentStack();

      assert.equal(Error.prepareStackTrace, originalPrepareStackTrace);
    });
  });
});
