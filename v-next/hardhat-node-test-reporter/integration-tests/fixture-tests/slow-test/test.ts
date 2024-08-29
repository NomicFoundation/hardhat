import assert from "node:assert/strict";
import { test } from "node:test";

test("slow test", async () => {
  await new Promise((resolve) => setTimeout(resolve, 100));
  assert.equal(1, 1);
});

test("assertion error in slow test", async () => {
  await new Promise((resolve) => setTimeout(resolve, 100));
  assert.equal(1, 2);
});
