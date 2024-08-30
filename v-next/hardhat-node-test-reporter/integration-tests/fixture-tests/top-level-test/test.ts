import assert from "node:assert/strict";
import { test } from "node:test";

test("top level test", async () => {
  assert.equal(1, 1);
});

test("assertion error in top level test", async () => {
  assert.equal(1, 2);
});

test("error with cause in top level test", async () => {
  throw new Error("error with cause", {
    cause: new Error("cause"),
  });
});

test("error with nested cause in top level test", async () => {
  throw new Error("error with cause", {
    cause: new Error("cause", {
      cause: new Error("nested cause"),
    }),
  });
});
