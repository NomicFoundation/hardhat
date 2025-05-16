import assert from "node:assert/strict";
import { it } from "mocha";

it("should not pass", () => {
  assert.fail("This test should fail");
});
