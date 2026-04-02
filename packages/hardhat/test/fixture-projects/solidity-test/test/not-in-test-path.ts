import assert from "node:assert/strict";
import { it } from "node:test";

it("should note run", () => {
  assert.fail("This test should not be run");
});
