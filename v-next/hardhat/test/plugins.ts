import assert from "node:assert/strict";
import path from "node:path";
import { describe, it } from "node:test";

import { assertThrows } from "@nomicfoundation/hardhat-test-utils";

import { UsingHardhat2PluginError } from "../src/internal/using-hardhat2-plugin-errors.js";
import { lazyFunction, lazyObject } from "../src/plugins.js";

describe("Hardhat 2 plugin compatibility", () => {
  it("should throw when calling lazyFunction", () => {
    assertThrows(
      () => lazyFunction(),
      (error) => {
        assert.ok(
          error instanceof UsingHardhat2PluginError,
          "Should be a UsingHardhat2PluginError",
        );
        assert.ok(
          error.callerRelativePath?.includes(
            path.join("test", "plugins.ts"),
          ) === true,
          "Should have the caller path",
        );
        return true;
      },
    );
  });

  it("should throw when calling lazyObject", () => {
    assertThrows(
      () => lazyObject(),
      (error) => {
        assert.ok(
          error instanceof UsingHardhat2PluginError,
          "Should be a UsingHardhat2PluginError",
        );
        assert.ok(
          error.callerRelativePath?.includes(
            path.join("test", "plugins.ts"),
          ) === true,
          "Should have the caller path",
        );
        return true;
      },
    );
  });
});
