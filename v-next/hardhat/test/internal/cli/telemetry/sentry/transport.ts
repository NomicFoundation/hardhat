import assert from "node:assert/strict";
import { test } from "node:test";

import { ensureString } from "../../../../../src/internal/cli/telemetry/sentry/transports/subprocess.js";

test("ensureString function", () => {
  assert.equal(
    ensureString("Test string"),
    "Test string",
    "Should return the same string input",
  );
  assert.equal(
    ensureString(new Uint8Array([72, 101, 108, 108, 111])),
    "Hello",
    "Should decode Uint8Array to string",
  );
  assert.equal(
    ensureString(new Uint8Array([])),
    "",
    "Should return an empty string for an empty Uint8Array",
  );
});
