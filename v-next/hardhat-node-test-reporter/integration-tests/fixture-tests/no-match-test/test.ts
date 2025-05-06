import assert from "node:assert/strict";
import { test } from "node:test";

test("match", () => {
  assert.match("foo", /^foo$/);
});

test("no match", () => {
  assert.match("foo", /^bar$/);
});
