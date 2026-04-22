import assert from "node:assert/strict";
import { test } from "node:test";

// This fixture is driven by test/index.ts. The outer test spawns the Hardhat
// CLI against this project with NODE_ENV *unset*. The `test nodejs` task is
// expected to default it to "test" (and to set HH_TEST regardless). We assert
// those side effects from inside the test worker — if they don't hold, the
// CLI exits non-zero and the outer test fails with our output attached.
test("task sets HH_TEST and defaults NODE_ENV to 'test' when unset", () => {
  assert.equal(process.env.HH_TEST, "true");
  assert.equal(process.env.NODE_ENV, "test");
});
