import assert from "node:assert/strict";
import path from "node:path";
import { describe, it } from "node:test";

import { assertThrows } from "@nomicfoundation/hardhat-test-utils";

import { UsingHardhat2PluginError } from "../src/internal/using-hardhat2-plugin-errors.js";
import { lazyFunction, lazyObject } from "../src/plugins.js";

function assertHardhat2PluginError(error: unknown, removedApi: string): true {
  assert.ok(
    error instanceof UsingHardhat2PluginError,
    "Should be a UsingHardhat2PluginError",
  );
  assert.ok(
    error.callerRelativePath?.includes(path.join("test", "plugins.ts")) ===
      true,
    "Should have the caller path",
  );
  assert.match(
    error.message,
    new RegExp(`The removed API is: .*${removedApi}`),
  );
  assert.match(error.message, /definePlugin from hardhat\/plugins/);
  return true;
}

describe("Hardhat 2 plugin compatibility", () => {
  it("should throw when calling lazyFunction", () => {
    assertThrows(
      () => lazyFunction(),
      (error) => assertHardhat2PluginError(error, "lazyFunction"),
    );
  });

  it("should throw when calling lazyObject", () => {
    assertThrows(
      () => lazyObject(),
      (error) => assertHardhat2PluginError(error, "lazyObject"),
    );
  });
});
