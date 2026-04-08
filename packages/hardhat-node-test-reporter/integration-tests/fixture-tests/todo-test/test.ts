import assert from "node:assert/strict";
import { test } from "node:test";

test.todo("todo with a callback", async () => {
  assert.equal(1, 2);
});

test.todo("todo without a callback");
