import { HardhatError } from "@nomicfoundation/hardhat-errors";

import {
  type UserCodeBoundaryCategory,
  ErrorCategory,
  USER_CODE_BOUNDARY_FRAME_MATCHERS,
} from "./classifier.js";
import { FrameOrigin, createErrorContext } from "./helpers.js";

/**
 * Decides if an error should be reported to Sentry or not, based on the
 * category returned by `classifyError(error)`.
 *
 * This first version intentionally uses a permissive policy: it drops clear
 * noise, reports categories that are likely to be Hardhat bugs, and only uses a
 * simple stack-shape heuristic for errors coming from user/plugin execution.
 *
 * @param error The error.
 * @param category The result of calling `classifyError(error)`.
 * @returns `true` if the error should be reported.
 */
export function shouldBeReported(
  error: Error,
  category: ErrorCategory,
): boolean {
  switch (category) {
    case ErrorCategory.CJS_TO_ESM_MIGRATION_ERROR:
    case ErrorCategory.HH2_TO_HH3_MIGRATION_ERROR:
    case ErrorCategory.TYPESCRIPT_SUPPORT_ERROR:
    case ErrorCategory.DEVELOPMENT_TIME_ERROR:
    case ErrorCategory.PROVIDER_INTERACTION_ERROR:
    case ErrorCategory.NETWORK_INTERACTION_ERROR:
    case ErrorCategory.RUNTIME_ENVIRONMENT_ERROR:
      return false;
    case ErrorCategory.HARDHAT_ERROR:
    case ErrorCategory.TASK_ACTION_ERROR:
    case ErrorCategory.EDR_ERROR:
    case ErrorCategory.FILESYSTEM_INTERACTION_ERROR:
    case ErrorCategory.UNEXPECTED_ERROR:
      return shouldReportNonUserCodeBoundaryError(error);
    case ErrorCategory.CONFIG_LOADING_ERROR:
    case ErrorCategory.CONSOLE_EVALUATION_ERROR:
    case ErrorCategory.SCRIPT_EXECUTION_ERROR:
    case ErrorCategory.NODE_TEST_EXECUTION_ERROR:
    case ErrorCategory.MOCHA_TEST_EXECUTION_ERROR:
    case ErrorCategory.PLUGIN_TASK_ACTION_ERROR:
    case ErrorCategory.USER_TASK_ACTION_ERROR:
    case ErrorCategory.PLUGIN_HOOK_HANDLER_ERROR:
      return shouldReportUserCodeBoundaryError(error, category);
  }
}

/**
 * Applies the HardhatError descriptor reporting policy for categories that
 * don't need user-code boundary inspection.
 */
function shouldReportNonUserCodeBoundaryError(error: Error): boolean {
  if (HardhatError.isHardhatError(error)) {
    return error.descriptor.shouldBeReported ?? false;
  }

  return true;
}

/**
 * Applies the HardhatError descriptor policy before using stack shape to decide
 * whether a user-code-boundary category should be reported.
 */
function shouldReportUserCodeBoundaryError(
  error: Error,
  category: UserCodeBoundaryCategory,
): boolean {
  if (HardhatError.isHardhatError(error)) {
    return error.descriptor.shouldBeReported ?? false;
  }

  return hasHardhatFrameBeforeBoundary(error, category);
}

/**
 * User-code-boundary categories mean Hardhat called into user or plugin code.
 * We don't want to report every plain user script/test/config/plugin failure,
 * but we do want to report when the stack shows user/plugin code calling back
 * into Hardhat and then Hardhat, or one of its dependencies, failing.
 *
 * To approximate that, this looks for a stack segment before the category's
 * boundary frame with this shape, from the throw site down:
 *
 *   dependency frames, optional
 *   Hardhat frame, at least one
 *   external frames, optional
 *   boundary frame
 *
 * In stack-array order, that means scanning from the throw site down to the
 * boundary and looking for a first-party Hardhat frame. If a user project frame
 * appears before that Hardhat frame, we treat the failure as user-owned and
 * don't report it.
 *
 * If no boundary frame is found in the error chain, we report the error. The
 * classifier has already assigned one of these boundary categories, so a
 * missing boundary frame means the filter couldn't validate the expected stack
 * shape. For this initial permissive filter, that should fail open to avoid
 * underreporting due to async stacks, wrapping, or parser limitations.
 *
 * We may reconsider making the external frames required in the future, as this
 * may be too much noise.
 */
function hasHardhatFrameBeforeBoundary(
  error: Error,
  category: UserCodeBoundaryCategory,
): boolean {
  const context = createErrorContext(error);
  const boundaryMatcher = USER_CODE_BOUNDARY_FRAME_MATCHERS[category];
  let boundaryFrameFound = false;

  for (const candidate of context.errorChain) {
    const frames = context.stackFramesByError.get(candidate) ?? [];
    const boundaryIndex = frames.findIndex(boundaryMatcher);

    if (boundaryIndex === -1) {
      continue;
    }

    boundaryFrameFound = true;

    for (let i = 0; i < boundaryIndex; i++) {
      const frame = frames[i];

      if (frame.origin === FrameOrigin.USER_PROJECT) {
        return false;
      }

      if (frame.origin === FrameOrigin.FIRST_PARTY) {
        return true;
      }
    }
  }

  return !boundaryFrameFound;
}
