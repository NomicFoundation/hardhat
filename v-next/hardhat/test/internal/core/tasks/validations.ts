import { describe, it } from "node:test";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import { assertThrowsHardhatError } from "@nomicfoundation/hardhat-test-utils";

import { validateAction } from "../../../../src/internal/core/tasks/validations.js";

describe("validateAction", () => {
  const action = async () => ({ default: () => {} });
  const inlineAction = () => {};

  it("should not throw when only action is provided", () => {
    validateAction(action, undefined, ["task-id"], false);
  });

  it("should not throw when only inlineAction is provided for user tasks", () => {
    validateAction(undefined, inlineAction, ["task-id"], false);
  });

  it("should throw when both action and inlineAction are provided", () => {
    assertThrowsHardhatError(
      () => validateAction(action, inlineAction, ["task-id"], false),
      HardhatError.ERRORS.CORE.TASK_DEFINITIONS.ACTION_ALREADY_SET,
      { task: "task-id" },
    );
  });

  it("should throw when inlineAction is provided for plugin tasks", () => {
    assertThrowsHardhatError(
      () => validateAction(undefined, inlineAction, ["task-id"], true),
      HardhatError.ERRORS.CORE.TASK_DEFINITIONS
        .INLINE_ACTION_CANNOT_BE_USED_IN_PLUGINS,
      { task: "task-id" },
    );
  });

  it("should throw when neither action nor inlineAction is provided", () => {
    assertThrowsHardhatError(
      () => validateAction(undefined, undefined, ["task-id"], false),
      HardhatError.ERRORS.CORE.TASK_DEFINITIONS.NO_ACTION,
      { task: "task-id" },
    );
  });

  it("should throw when neither action nor inlineAction is provided for plugin tasks", () => {
    assertThrowsHardhatError(
      () => validateAction(undefined, undefined, ["task-id"], true),
      HardhatError.ERRORS.CORE.TASK_DEFINITIONS.NO_ACTION,
      { task: "task-id" },
    );
  });

  it("should allow action for plugin tasks", () => {
    validateAction(action, undefined, ["task-id"], true);
  });

  it("should throw plugin-specific error when both action and inlineAction are provided for plugins", () => {
    assertThrowsHardhatError(
      () => validateAction(action, inlineAction, ["task-id"], true),
      HardhatError.ERRORS.CORE.TASK_DEFINITIONS
        .INLINE_ACTION_CANNOT_BE_USED_IN_PLUGINS,
      { task: "task-id" },
    );
  });

  it("should handle subtask ids correctly in error messages", () => {
    assertThrowsHardhatError(
      () => validateAction(undefined, inlineAction, ["parent", "child"], true),
      HardhatError.ERRORS.CORE.TASK_DEFINITIONS
        .INLINE_ACTION_CANNOT_BE_USED_IN_PLUGINS,
      { task: "parent child" },
    );
  });
});
