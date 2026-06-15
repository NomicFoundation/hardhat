import assert from "node:assert/strict";
import path from "node:path";
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

function assertHardhat2PluginError(
  error: unknown,
  removedApi: string,
  migrationHint: RegExp,
): true {
  assert.ok(
    error instanceof UsingHardhat2PluginError,
    "Should be a UsingHardhat2PluginError",
  );
  assert.ok(
    error.callerRelativePath?.includes(path.join("test", "config.ts")) === true,
    "Should have the caller path",
  );
  assert.match(
    error.message,
    new RegExp(`The removed API is: .*${removedApi}`),
  );
  assert.match(error.message, migrationHint);
  return true;
}

describe("Hardhat 2 plugin compatibility", () => {
  it("should throw when calling extendConfig", () => {
    assertThrows(
      () => extendConfig(),
      (error) =>
        assertHardhat2PluginError(
          error,
          "extendConfig",
          /definePlugin from hardhat\/plugins/,
        ),
    );
  });

  it("should throw when calling extendEnvironment", () => {
    assertThrows(
      () => extendEnvironment(),
      (error) =>
        assertHardhat2PluginError(
          error,
          "extendEnvironment",
          /definePlugin from hardhat\/plugins/,
        ),
    );
  });

  it("should throw when calling extendProvider", () => {
    assertThrows(
      () => extendProvider(),
      (error) =>
        assertHardhat2PluginError(
          error,
          "extendProvider",
          /definePlugin from hardhat\/plugins/,
        ),
    );
  });

  it("should throw when calling scope", () => {
    assertThrows(
      () => scope(),
      (error) =>
        assertHardhat2PluginError(
          error,
          "scope",
          /task or emptyTask from hardhat\/config/,
        ),
    );
  });

  it("should throw when calling subtask", () => {
    assertThrows(
      () => subtask(),
      (error) =>
        assertHardhat2PluginError(
          error,
          "subtask",
          /nested tasks with task or emptyTask/,
        ),
    );
  });
});
