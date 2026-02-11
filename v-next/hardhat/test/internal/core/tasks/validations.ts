import { describe, it } from "node:test";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import { assertThrowsHardhatError } from "@nomicfoundation/hardhat-test-utils";

import { validateAction } from "../../../../src/internal/core/tasks/validations.js";

describe("validateAction", () => {
  it("should not throw when only action is provided", () => {
    const action = async () => ({ default: () => {} });
    validateAction(action, undefined, ["task-id"], false);
  });

  it("should not throw when only inlineAction is provided for user tasks", () => {
    const inlineAction = () => {};
    validateAction(undefined, inlineAction, ["task-id"], false);
  });

  it("should throw when both action and inlineAction are provided", () => {
    const action = async () => ({ default: () => {} });
    const inlineAction = () => {};

    assertThrowsHardhatError(
      () => validateAction(action, inlineAction, ["task-id"], false),
      HardhatError.ERRORS.CORE.TASK_DEFINITIONS
        .ACTION_AND_INLINE_ACTION_CONFLICT,
      { task: "task-id" },
    );
  });

  it("should throw when inlineAction is provided for plugin tasks", () => {
    const inlineAction = () => {};

    assertThrowsHardhatError(
      () => validateAction(undefined, inlineAction, ["task-id"], true),
      HardhatError.ERRORS.CORE.TASK_DEFINITIONS
        .INLINE_ACTION_CANNOT_BE_USED_IN_PLUGINS,
      { task: "task-id" },
    );
  });

  it("should allow action for plugin tasks", () => {
    const action = async () => ({ default: () => {} });
    validateAction(action, undefined, ["task-id"], true);
  });

  it("should handle subtask ids correctly in error messages", () => {
    const inlineAction = () => {};

    assertThrowsHardhatError(
      () => validateAction(undefined, inlineAction, ["parent", "child"], true),
      HardhatError.ERRORS.CORE.TASK_DEFINITIONS
        .INLINE_ACTION_CANNOT_BE_USED_IN_PLUGINS,
      { task: "parent child" },
    );
  });
});
