/**
 * @file This files has a set of helpers that depend on the codebase. They
 * inspect the stack frames to look for known folders, files, or function names.
 *
 * As such, they are somewhat fragile and need to be periodically reevaluated,
 * especially after large refactors to Hardhat's core.
 */

import { type StackFrame, includesAny } from "./helpers.js";

/**
 * Returns true when this package is being executed from the Hardhat monorepo
 * source tree instead of from an installed `node_modules/hardhat` package.
 */
export function isRunningInsideHardhatMonorepo(): boolean {
  // If if this file is in `/packages/hardhat/`, as opposed to
  // `node_modules/hardhat/`, then we're running inside the monorepo.
  return import.meta.url.includes("/packages/hardhat/");
}

// ---------------------------------------------------------------------------
// Boundary frame predicates
//
// These identify the first-party frames that mark the boundary between
// Hardhat-controlled code and the user/plugin code that ultimately ran. Both
// the classifier (to assign a category) and the filter (to find the frame
// above the boundary) need to agree on what those frames look like, so they
// share a single definition here.
// ---------------------------------------------------------------------------

/**
 * Matches the Hardhat frame that imports the user's config file.
 */
export function isConfigLoadingBoundaryFrame(frame: StackFrame): boolean {
  return (
    frame.location.includes("internal/config-loading.") &&
    frame.functionName?.includes("importUserConfig") === true
  );
}

/**
 * Matches the builtin console task frame that evaluates user input.
 */
export function isConsoleEvaluationBoundaryFrame(frame: StackFrame): boolean {
  return (
    frame.location.includes("/internal/builtin-plugins/console/task-action.") &&
    frame.functionName?.includes("consoleAction") === true
  );
}

/**
 * Matches the builtin run task frame that executes a user script.
 */
export function isScriptExecutionBoundaryFrame(frame: StackFrame): boolean {
  return (
    frame.location.includes("/internal/builtin-plugins/run/task-action.") &&
    frame.functionName?.includes("runScriptWithHardhat") === true
  );
}

/**
 * Matches the node:test runner task frame that executes user tests.
 */
export function isNodeTestExecutionBoundaryFrame(frame: StackFrame): boolean {
  return (
    frame.location.includes("/hardhat-node-test-runner/src/task-action.") &&
    frame.functionName?.includes("testWithHardhat") === true
  );
}

/**
 * Matches the Mocha runner task frame that executes user tests.
 */
export function isMochaTestExecutionBoundaryFrame(frame: StackFrame): boolean {
  return (
    frame.location.includes("/hardhat-mocha/src/task-action.") &&
    frame.functionName?.includes("testWithHardhat") === true
  );
}

/**
 * Matches the resolved-task frame that calls into a task action.
 */
export function isTaskActionBoundaryFrame(frame: StackFrame): boolean {
  return (
    frame.location.includes("/internal/core/tasks/resolved-task.") &&
    frame.functionName?.includes(".run") === true
  );
}

/**
 * Matches the hook-manager frame that calls into hook handlers.
 */
export function isHookHandlerBoundaryFrame(frame: StackFrame): boolean {
  return (
    frame.location.includes("/internal/core/hook-manager.") &&
    includesAny(
      frame.functionName,
      ".runHandlerChain",
      ".runSequentialHandlers",
      ".runParallelHandlers",
    )
  );
}

// ---------------------------------------------------------------------------
// Execution frame finders
//
// These locate the stack frame that identifies who the actual task action or
// hook handler is, relative to the boundary frame.
// ---------------------------------------------------------------------------

/**
 * Finds the task action frame immediately above the resolved-task boundary.
 */
export function getTaskExecutionFrame(
  frames: StackFrame[],
): StackFrame | undefined {
  const resolvedTaskRunIndex = frames.findIndex(isTaskActionBoundaryFrame);

  if (resolvedTaskRunIndex === -1) {
    return;
  }

  // The frames between `task.run` calls may include other resolved-task.ts
  // helpers; we want the last frame that does not belong to that file.
  return frames
    .slice(0, resolvedTaskRunIndex)
    .findLast(
      (frame) =>
        frame.location.includes("/internal/core/tasks/resolved-task.") ===
        false,
    );
}

/**
 * Finds the hook handler frame immediately above the hook-manager boundary.
 */
export function getHookExecutionFrame(
  frames: StackFrame[],
): StackFrame | undefined {
  const hookManagerIndex = frames.findIndex(isHookHandlerBoundaryFrame);

  if (hookManagerIndex === -1) {
    return;
  }

  // The frames between hook-manager calls may include other hook-manager
  // helpers; we want the last frame that does not belong to that file.
  return frames
    .slice(0, hookManagerIndex)
    .findLast(
      (frame) =>
        frame.location.includes("/internal/core/hook-manager.") === false,
    );
}

// ---------------------------------------------------------------------------
// Frame origin / ownership helpers
// ---------------------------------------------------------------------------

/**
 * Returns true for stack locations owned by packages outside Hardhat.
 */
export function isThirdPartyFrame(location: string): boolean {
  return (
    location.includes("/node_modules/") &&
    isFirstPartyPluginFrame(location) === false
  );
}

/**
 * Returns true for stack locations owned by Hardhat or first-party packages.
 */
export function isFirstPartyPluginFrame(location: string): boolean {
  return includesAny(
    location,
    "/node_modules/hardhat/",
    "/node_modules/@nomicfoundation/",
  );
}

/**
 * Returns true when the error stack appears to come from workspace
 * initialization.
 */
export function isWorkspaceInitFilesystemFrame(error: Error): boolean {
  return error.stack?.includes("/internal/cli/init") ?? false;
}

/**
 * Returns true for stack frames owned by EDR provider or stack-trace code.
 */
export function isEdrFrame(frame: StackFrame): boolean {
  return includesAny(
    frame.location,
    "/builtin-plugins/network-manager/edr/",
    "/edr-provider.",
  );
}
