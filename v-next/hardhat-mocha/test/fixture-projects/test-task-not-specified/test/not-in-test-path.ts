// This file is not in the test path, so it should not be executed

import assert from "node:assert/strict";
import { it } from "mocha";

it("should fail if executed", () => {
  assert.fail("This test should not be run");
});
