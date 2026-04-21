import assert from "node:assert/strict";
import { test } from "node:test";

// This fixture is driven by test/index.ts. The outer test spawns the Hardhat
// CLI against this project with NODE_ENV preset to "HELLO". The `test nodejs`
// task uses `??=` to default NODE_ENV, so a pre-existing value must be left
// untouched. HH_TEST is set unconditionally. We assert both from inside the
// test worker.
test("task preserves a pre-existing NODE_ENV and still sets HH_TEST", () => {
  assert.equal(process.env.HH_TEST, "true");
  assert.equal(process.env.NODE_ENV, "HELLO");
});
