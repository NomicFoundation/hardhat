import assert from "node:assert/strict";
import { test } from "node:test";

/* eslint-disable-next-line no-only-tests/no-only-tests -- testing test.only explicitly */
test.only("top level test", async () => {
  assert.equal(1, 2);
});
