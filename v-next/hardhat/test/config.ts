import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { assertThrows } from "@nomicfoundation/hardhat-test-utils";

import {
  extendConfig,
  extendEnvironment,
  extendProvider,
  scope,
  subtask,
} from "../src/config.js";
import { UsingHardhat2PluginError } from "../src/internal/using-hardhat2-plugin-errors.js";

describe("Hardhat 2 plugin compatibility", () => {
  it("should throw when calling extendConfig", () => {
    assertThrows(
      () => extendConfig(),
      (error) => {
        assert.ok(
          error instanceof UsingHardhat2PluginError,
          "Should be a UsingHardhat2PluginError",
        );
        assert.ok(
          error.callerRelativePath?.includes("test/config.ts") === true,
          "Should have the caller path",
        );
        return true;
      },
    );
  });

  it("should throw when calling extendEnvironment", () => {
    assertThrows(
      () => extendEnvironment(),
      (error) => {
        assert.ok(
          error instanceof UsingHardhat2PluginError,
          "Should be a UsingHardhat2PluginError",
        );
        assert.ok(
          error.callerRelativePath?.includes("test/config.ts") === true,
          "Should have the caller path",
        );
        return true;
      },
    );
  });

  it("should throw when calling extendProvider", () => {
    assertThrows(
      () => extendProvider(),
      (error) => {
        assert.ok(
          error instanceof UsingHardhat2PluginError,
          "Should be a UsingHardhat2PluginError",
        );
        assert.ok(
          error.callerRelativePath?.includes("test/config.ts") === true,
          "Should have the caller path",
        );
        return true;
      },
    );
  });

  it("should throw when calling scope", () => {
    assertThrows(
      () => scope(),
      (error) => {
        assert.ok(
          error instanceof UsingHardhat2PluginError,
          "Should be a UsingHardhat2PluginError",
        );
        assert.ok(
          error.callerRelativePath?.includes("test/config.ts") === true,
          "Should have the caller path",
        );
        return true;
      },
    );
  });

  it("should throw when calling subtask", () => {
    assertThrows(
      () => subtask(),
      (error) => {
        assert.ok(
          error instanceof UsingHardhat2PluginError,
          "Should be a UsingHardhat2PluginError",
        );
        assert.ok(
          error.callerRelativePath?.includes("test/config.ts") === true,
          "Should have the caller path",
        );
        return true;
      },
    );
  });
});
