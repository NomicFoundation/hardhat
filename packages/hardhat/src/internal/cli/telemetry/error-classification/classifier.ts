import { HardhatError } from "@nomicfoundation/hardhat-errors";
import {
  DirectoryNotEmptyError,
  FileAlreadyExistsError,
  FileNotFoundError,
  FileSystemAccessError,
  InvalidFileFormatError,
  IsDirectoryError,
  NotADirectoryError,
} from "@nomicfoundation/hardhat-utils/fs";
import {
  PackageJsonNotFoundError,
  PackageJsonReadError,
} from "@nomicfoundation/hardhat-utils/package";
import {
  DispatcherError,
  RequestError,
  ResponseStatusCodeError,
} from "@nomicfoundation/hardhat-utils/request";
import {
  SubprocessFileNotFoundError,
  SubprocessPathIsDirectoryError,
} from "@nomicfoundation/hardhat-utils/subprocess";

import {
  EdrProviderStackTraceGenerationError,
  SolidityTestStackTraceGenerationError,
} from "../../../builtin-plugins/network-manager/edr/stack-traces/stack-trace-generation-errors.js";
import {
  ProviderError,
  UnknownError,
} from "../../../builtin-plugins/network-manager/provider-errors.js";
import { UsingHardhat2PluginError } from "../../../using-hardhat2-plugin-errors.js";

import {
  getHookExecutionFrame,
  getTaskExecutionFrame,
  isConfigLoadingBoundaryFrame,
  isConsoleEvaluationBoundaryFrame,
  isEdrFrame,
  isFirstPartyPluginFrame,
  isHookHandlerBoundaryFrame,
  isMochaTestExecutionBoundaryFrame,
  isNodeTestExecutionBoundaryFrame,
  isRunningInsideHardhatMonorepo,
  isScriptExecutionBoundaryFrame,
  isTaskActionBoundaryFrame,
  isThirdPartyFrame,
} from "./codebase-dependent-helpers.js";
import {
  type ErrorContext,
  type StackFrame,
  FrameOrigin,
  createErrorContext,
  getNodeErrorCode,
  hasErrorClassName,
  includesAny,
} from "./helpers.js";

/**
 * Classifies the error based on a set of heuristics.
 *
 * This classification is later used to select different criteria to decided if
 * the error should be reported or not, and in some cases, how to display it in
 * the CLI.
 *
 * @param error The error to classify.
 * @param ignoreDevelopmentTimeFilter If true, the classifier will ignore the
 * development-time filter, which is used to exclude errors that happen during
 * development of Hardhat itself. This is only meant to be used for testing.
 * @returns The error category.
 */
export function classifyError(
  error: Error,
  ignoreDevelopmentTimeFilter = false,
): ErrorCategory {
  const context = createErrorContext(error);

  for (const matcher of ERROR_CATEGORY_MATCHERS) {
    if (ignoreDevelopmentTimeFilter && matcher === isDevelopmentTimeError) {
      continue;
    }

    const category = matcher(context);
    if (category !== undefined) {
      return category;
    }
  }

  return ErrorCategory.UNEXPECTED_ERROR;
}

export enum ErrorCategory {
  CJS_TO_ESM_MIGRATION_ERROR = "CJS_TO_ESM_MIGRATION_ERROR",
  HH2_TO_HH3_MIGRATION_ERROR = "HH2_TO_HH3_MIGRATION_ERROR",
  TYPESCRIPT_SUPPORT_ERROR = "TYPESCRIPT_SUPPORT_ERROR",
  DEVELOPMENT_TIME_ERROR = "DEVELOPMENT_TIME_ERROR",
  HARDHAT_ERROR = "HARDHAT_ERROR",
  CONFIG_LOADING_ERROR = "CONFIG_LOADING_ERROR",
  CONSOLE_EVALUATION_ERROR = "CONSOLE_EVALUATION_ERROR",
  SCRIPT_EXECUTION_ERROR = "SCRIPT_EXECUTION_ERROR",
  NODE_TEST_EXECUTION_ERROR = "NODE_TEST_EXECUTION_ERROR",
  MOCHA_TEST_EXECUTION_ERROR = "MOCHA_TEST_EXECUTION_ERROR",
  TASK_ACTION_ERROR = "TASK_ACTION_ERROR",
  PLUGIN_TASK_ACTION_ERROR = "PLUGIN_TASK_ACTION_ERROR",
  USER_TASK_ACTION_ERROR = "USER_TASK_ACTION_ERROR",
  PLUGIN_HOOK_HANDLER_ERROR = "PLUGIN_HOOK_HANDLER_ERROR",
  PROVIDER_INTERACTION_ERROR = "PROVIDER_INTERACTION_ERROR",
  EDR_ERROR = "EDR_ERROR",
  NETWORK_INTERACTION_ERROR = "NETWORK_INTERACTION_ERROR",
  RUNTIME_ENVIRONMENT_ERROR = "RUNTIME_ENVIRONMENT_ERROR",
  FILESYSTEM_INTERACTION_ERROR = "FILESYSTEM_INTERACTION_ERROR",
  UNEXPECTED_ERROR = "UNEXPECTED_ERROR",
}

type ErrorCategoryMatcher = (
  context: ErrorContext,
) => ErrorCategory | undefined;

export type UserCodeBoundaryCategory =
  | ErrorCategory.CONFIG_LOADING_ERROR
  | ErrorCategory.CONSOLE_EVALUATION_ERROR
  | ErrorCategory.SCRIPT_EXECUTION_ERROR
  | ErrorCategory.NODE_TEST_EXECUTION_ERROR
  | ErrorCategory.MOCHA_TEST_EXECUTION_ERROR
  | ErrorCategory.PLUGIN_TASK_ACTION_ERROR
  | ErrorCategory.USER_TASK_ACTION_ERROR
  | ErrorCategory.PLUGIN_HOOK_HANDLER_ERROR;

export const USER_CODE_BOUNDARY_FRAME_MATCHERS: Record<
  UserCodeBoundaryCategory,
  (frame: StackFrame) => boolean
> = {
  [ErrorCategory.CONFIG_LOADING_ERROR]: isConfigLoadingBoundaryFrame,
  [ErrorCategory.CONSOLE_EVALUATION_ERROR]: isConsoleEvaluationBoundaryFrame,
  [ErrorCategory.SCRIPT_EXECUTION_ERROR]: isScriptExecutionBoundaryFrame,
  [ErrorCategory.NODE_TEST_EXECUTION_ERROR]: isNodeTestExecutionBoundaryFrame,
  [ErrorCategory.MOCHA_TEST_EXECUTION_ERROR]: isMochaTestExecutionBoundaryFrame,
  [ErrorCategory.PLUGIN_TASK_ACTION_ERROR]: isTaskActionBoundaryFrame,
  [ErrorCategory.USER_TASK_ACTION_ERROR]: isTaskActionBoundaryFrame,
  [ErrorCategory.PLUGIN_HOOK_HANDLER_ERROR]: isHookHandlerBoundaryFrame,
};

// These are categories that only need the boundary check for classification
const BOUNDARY_ONLY_ERROR_CATEGORIES = [
  ErrorCategory.CONFIG_LOADING_ERROR,
  ErrorCategory.SCRIPT_EXECUTION_ERROR,
  ErrorCategory.NODE_TEST_EXECUTION_ERROR,
  ErrorCategory.MOCHA_TEST_EXECUTION_ERROR,
  ErrorCategory.CONSOLE_EVALUATION_ERROR,
] as const;

// IMPORTANT: The order here matters, as the first matcher that returns a
// category wins
const ERROR_CATEGORY_MATCHERS: ErrorCategoryMatcher[] = [
  isDevelopmentTimeError,
  isESMMigrationError,
  isHH3MigrationError,
  isTypescriptSupportError,
  isHardhatError,
  isProviderInteractionError,
  isEdrError,
  isNetworkInteractionError,
  isRuntimeEnvironmentError,
  isFilesystemInteractionError,
  isTaskActionError,
  isBoundaryOnlyError,
  isPluginTaskActionError,
  isUserTaskActionError,
  isPluginHookHandlerError,
];

const ESM_MIGRATION_MARKERS = [
  "require is not defined in es module scope",
  "module is not defined in es module scope",
  "exports is not defined in es module scope",
];

/**
 * Classifies common CommonJS/ESM migration failures by matching standard Node
 * runtime markers.
 */
function isESMMigrationError(
  context: ErrorContext,
): ErrorCategory.CJS_TO_ESM_MIGRATION_ERROR | undefined {
  for (const marker of ESM_MIGRATION_MARKERS) {
    if (context.lowercaseMessage.includes(marker)) {
      return ErrorCategory.CJS_TO_ESM_MIGRATION_ERROR;
    }
  }

  if (
    context.errorChain.some((candidate) =>
      /require\(\) of ES Module/i.test(candidate.message),
    )
  ) {
    return ErrorCategory.CJS_TO_ESM_MIGRATION_ERROR;
  }
}

const HH3_MIGRATION_MARKERS = [
  "class extends value undefined is not a constructor or null",
  "the requested module 'hardhat' does not provide an export named",
  'the requested module "hardhat" does not provide an export named',
  "the requested module 'hardhat/config' does not provide an export named",
  'the requested module "hardhat/config" does not provide an export named',
  "the requested module 'hardhat/plugins' does not provide an export named",
  'the requested module "hardhat/plugins" does not provide an export named',
  "the requested module 'hardhat/builtin-tasks/task-names' does not provide an export named",
  'the requested module "hardhat/builtin-tasks/task-names" does not provide an export named',
  "the requested module 'hardhat/types/runtime' does not provide an export named",
  'the requested module "hardhat/types/runtime" does not provide an export named',
];

/**
 * Classifies Hardhat 2 to Hardhat 3 migration failures by checking for known
 * migration error types and message patterns anywhere in the cause chain.
 */
function isHH3MigrationError(
  context: ErrorContext,
): ErrorCategory.HH2_TO_HH3_MIGRATION_ERROR | undefined {
  if (
    context.errorChain.some((candidate) =>
      hasErrorClassName(candidate, UsingHardhat2PluginError),
    ) ||
    context.errorChain.some((candidate) =>
      /You are trying to use a Hardhat 2 plugin in a Hardhat 3 project/i.test(
        candidate.message,
      ),
    )
  ) {
    return ErrorCategory.HH2_TO_HH3_MIGRATION_ERROR;
  }

  for (const marker of HH3_MIGRATION_MARKERS) {
    if (context.lowercaseMessage.includes(marker)) {
      return ErrorCategory.HH2_TO_HH3_MIGRATION_ERROR;
    }
  }

  if (
    context.errorChain.some(
      (candidate) => candidate.stack?.includes("@nomiclabs") === true,
    )
  ) {
    return ErrorCategory.HH2_TO_HH3_MIGRATION_ERROR;
  }
}

/**
 * If Hardhat is being run from the monorepo, we don't report the error.
 */
function isDevelopmentTimeError(
  _context: ErrorContext,
): ErrorCategory.DEVELOPMENT_TIME_ERROR | undefined {
  if (isRunningInsideHardhatMonorepo()) {
    return ErrorCategory.DEVELOPMENT_TIME_ERROR;
  }

  return undefined;
}

const TYPESCRIPT_SUPPORT_ERROR_CODES = new Set([
  "ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX",
  "ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING",
  "ERR_NO_TYPESCRIPT",
  "ERR_UNKNOWN_FILE_EXTENSION",
]);

/**
 * Classifies Node.js TypeScript support failures by matching Node's stable
 * error codes. ERR_UNKNOWN_FILE_EXTENSION also happens for non-TypeScript
 * extensions, so require a TypeScript extension in that error's message.
 */
function isTypescriptSupportError(
  context: ErrorContext,
): ErrorCategory.TYPESCRIPT_SUPPORT_ERROR | undefined {
  if (
    context.errorChain.some((candidate) => {
      const code = getTypescriptSupportErrorCode(candidate);

      if (code === undefined) {
        return false;
      }

      return (
        code !== "ERR_UNKNOWN_FILE_EXTENSION" ||
        includesAny(candidate.message, ".ts", ".mts", ".cts")
      );
    })
  ) {
    return ErrorCategory.TYPESCRIPT_SUPPORT_ERROR;
  }
}

/**
 * Classifies top-level HardhatError instances that were not captured by a more
 * specific matcher earlier in the chain.
 */
function isHardhatError(
  context: ErrorContext,
): ErrorCategory.HARDHAT_ERROR | undefined {
  if (HardhatError.isHardhatError(context.error)) {
    return ErrorCategory.HARDHAT_ERROR;
  }
}

function isBoundaryOnlyError(
  context: ErrorContext,
): (typeof BOUNDARY_ONLY_ERROR_CATEGORIES)[number] | undefined {
  for (const category of BOUNDARY_ONLY_ERROR_CATEGORIES) {
    const boundaryMatcher = USER_CODE_BOUNDARY_FRAME_MATCHERS[category];

    if (context.allStackFrames.some(boundaryMatcher)) {
      return category;
    }
  }
}

/**
 * Classifies task-action failures routed through ResolvedTask when the nearest
 * task-action frame belongs to first-party code.
 */
function isTaskActionError(
  context: ErrorContext,
): ErrorCategory.TASK_ACTION_ERROR | undefined {
  const taskActionFrame = getTaskExecutionFrame(context.allStackFrames);

  if (
    taskActionFrame !== undefined &&
    isFirstPartyPluginFrame(taskActionFrame.location)
  ) {
    return ErrorCategory.TASK_ACTION_ERROR;
  }
}

/**
 * Classifies task-action failures routed through ResolvedTask when the nearest
 * task-action frame belongs to a third-party plugin.
 */
function isPluginTaskActionError(
  context: ErrorContext,
): ErrorCategory.PLUGIN_TASK_ACTION_ERROR | undefined {
  const taskActionFrame = getTaskExecutionFrame(context.allStackFrames);

  if (
    taskActionFrame !== undefined &&
    isThirdPartyFrame(taskActionFrame.location)
  ) {
    return ErrorCategory.PLUGIN_TASK_ACTION_ERROR;
  }
}

/**
 * Classifies task-action failures routed through ResolvedTask when the nearest
 * task-action frame belongs to user project code.
 */
function isUserTaskActionError(
  context: ErrorContext,
): ErrorCategory.USER_TASK_ACTION_ERROR | undefined {
  const taskActionFrame = getTaskExecutionFrame(context.allStackFrames);

  if (
    taskActionFrame !== undefined &&
    taskActionFrame.origin === FrameOrigin.USER_PROJECT
  ) {
    return ErrorCategory.USER_TASK_ACTION_ERROR;
  }
}

/**
 * Classifies hook execution failures routed through HookManager when the
 * nearest hook-handler frame belongs to a third-party plugin.
 */
function isPluginHookHandlerError(
  context: ErrorContext,
): ErrorCategory.PLUGIN_HOOK_HANDLER_ERROR | undefined {
  const hookExecutionFrame = getHookExecutionFrame(context.allStackFrames);

  if (
    hookExecutionFrame !== undefined &&
    isThirdPartyFrame(hookExecutionFrame.location)
  ) {
    return ErrorCategory.PLUGIN_HOOK_HANDLER_ERROR;
  }
}

const PROVIDER_INTERACTION_ERROR_WRAPPED_IN_UNKNOWN_EDR_ERROR_MARKERS = [
  "unauthorized",
  "rate limit",
  "too many requests",
  "historical state unavailable",
];

/**
 * Classifies provider-facing failures, including Solidity errors, expected
 * provider errors, and selected UnknownError cases with provider-like causes.
 */
function isProviderInteractionError(
  context: ErrorContext,
): ErrorCategory.PROVIDER_INTERACTION_ERROR | undefined {
  if (
    context.errorChain.some(
      (candidate) =>
        candidate.name === "SolidityError" ||
        (ProviderError.isProviderError(candidate) &&
          isUnknownEdrError(candidate, context) === false),
    )
  ) {
    return ErrorCategory.PROVIDER_INTERACTION_ERROR;
  }

  if (
    isUnknownEdrError(context.errorChain[0], context) &&
    context.errorChain[1] !== undefined &&
    includesAny(
      context.errorChain[1].message.toLowerCase(),
      ...PROVIDER_INTERACTION_ERROR_WRAPPED_IN_UNKNOWN_EDR_ERROR_MARKERS,
    )
  ) {
    return ErrorCategory.PROVIDER_INTERACTION_ERROR;
  }
}

/**
 * Classifies EDR-specific failures, including stack-trace generation errors
 * and remaining UnknownError cases from the provider layer.
 */
function isEdrError(
  context: ErrorContext,
): ErrorCategory.EDR_ERROR | undefined {
  if (
    context.errorChain.some(
      (candidate) =>
        hasErrorClassName(candidate, EdrProviderStackTraceGenerationError) ||
        hasErrorClassName(candidate, SolidityTestStackTraceGenerationError) ||
        isUnknownEdrError(candidate, context),
    )
  ) {
    return ErrorCategory.EDR_ERROR;
  }
}

/**
 * Classifies network-related failures by collapsing request setup, request
 * transport, response status, and telemetry transport errors into one bucket.
 */
function isNetworkInteractionError(
  context: ErrorContext,
): ErrorCategory.NETWORK_INTERACTION_ERROR | undefined {
  if (
    context.errorChain.some((candidate) =>
      hasErrorClassName(candidate, ResponseStatusCodeError),
    ) ||
    context.errorChain.some((candidate) =>
      hasErrorClassName(candidate, DispatcherError),
    ) ||
    context.errorChain.some((candidate) =>
      hasErrorClassName(candidate, RequestError),
    ) ||
    context.lowercaseMessage.includes("fetch failed")
  ) {
    return ErrorCategory.NETWORK_INTERACTION_ERROR;
  }
}

/**
 * Classifies runtime-environment incompatibilities by matching a small set of
 * capability-related error messages.
 */
function isRuntimeEnvironmentError(
  context: ErrorContext,
): ErrorCategory.RUNTIME_ENVIRONMENT_ERROR | undefined {
  if (
    context.errorChain.some((candidate) =>
      includesAny(
        candidate.message.toLowerCase(),
        "toreversed is not a function",
        "flatmap is not a function",
        "crypto is not defined",
      ),
    )
  ) {
    return ErrorCategory.RUNTIME_ENVIRONMENT_ERROR;
  }
}

/**
 * Classifies project-data and filesystem-related failures by matching a known
 * filesystem/project-data error type or a raw Node.js filesystem error code
 * anywhere in the cause chain.
 */
function isFilesystemInteractionError(
  context: ErrorContext,
): ErrorCategory.FILESYSTEM_INTERACTION_ERROR | undefined {
  if (
    context.errorChain.some(
      (candidate) =>
        isKnownFilesystemOrProjectDataError(candidate) ||
        isNodeFilesystemError(candidate),
    )
  ) {
    return ErrorCategory.FILESYSTEM_INTERACTION_ERROR;
  }
}

function isUnknownEdrError(error: Error, context: ErrorContext): boolean {
  const errorIndex = context.errorChain.indexOf(error);
  const errorChain =
    errorIndex === -1 ? [error] : context.errorChain.slice(errorIndex);

  return (
    ProviderError.isProviderError(error) &&
    (error.code === UnknownError.CODE || error.name === "UnknownError") &&
    errorChain.some((candidate) =>
      (context.stackFramesByError.get(candidate) ?? []).some(isEdrFrame),
    )
  );
}

// This list should be kept up to date with hardhat-utils/fs errors
const HARDHAT_UTILS_FILESYSTEM_ERROR_CLASSES = [
  PackageJsonReadError,
  PackageJsonNotFoundError,
  InvalidFileFormatError,
  FileNotFoundError,
  IsDirectoryError,
  NotADirectoryError,
  FileAlreadyExistsError,
  DirectoryNotEmptyError,
] as const;

// This list should be kept up to date with hardhat-utils/subprocess errors
const HARDHAT_UTILS_SUBPROCESS_ERROR_CLASSES = [
  SubprocessFileNotFoundError,
  SubprocessPathIsDirectoryError,
] as const;

const NODE_FILESYSTEM_ERROR_CODES = new Set([
  "EACCES",
  "EAGAIN",
  "EBADF",
  "EBUSY",
  "EEXIST",
  "EFBIG",
  "EINTR",
  "EINVAL",
  "EIO",
  "EISDIR",
  "ELOOP",
  "EMFILE",
  "ENAMETOOLONG",
  "ENFILE",
  "ENODEV",
  "ENOENT",
  "ENOSPC",
  "ENOTDIR",
  "ENOTEMPTY",
  "ENOTSUP",
  "ENXIO",
  "EOPNOTSUPP",
  "EOVERFLOW",
  "EPERM",
  "EROFS",
  "ESPIPE",
  "ETXTBSY",
  "EXDEV",
]);

/**
 * Returns `true` for any of the filesystem/project-data error classes the
 * classifier knows about. This is the gate for the FILESYSTEM_INTERACTION_ERROR
 * category.
 */
export function isKnownFilesystemOrProjectDataError(error: Error): boolean {
  return (
    isHardhatUtilsFilesystemError(error) ||
    isSubprocessFilesystemError(error) ||
    hasErrorClassName(error, FileSystemAccessError)
  );
}

/**
 * Returns `true` for filesystem errors that callers commonly expect to surface
 * during normal operation (e.g. missing files, format errors). Used by both
 * the classifier (as part of the filesystem-interaction gate) and the filter
 * (to drop these errors from reporting).
 */
export function isHardhatUtilsFilesystemError(error: Error): boolean {
  return HARDHAT_UTILS_FILESYSTEM_ERROR_CLASSES.some((cls) =>
    hasErrorClassName(error, cls),
  );
}

/**
 * Returns `true` for filesystem errors raised by the subprocess-spawning
 * helpers. These are unexpected enough to be worth reporting on their own.
 */
export function isSubprocessFilesystemError(error: Error): boolean {
  return HARDHAT_UTILS_SUBPROCESS_ERROR_CLASSES.some((cls) =>
    hasErrorClassName(error, cls),
  );
}

/**
 * Returns `true` for the node errors with fs related codes.
 */
function isNodeFilesystemError(error: Error): boolean {
  const code = getNodeErrorCode(error);

  return code !== undefined && NODE_FILESYSTEM_ERROR_CODES.has(code);
}

function getTypescriptSupportErrorCode(error: Error): string | undefined {
  if (
    "code" in error &&
    typeof error.code === "string" &&
    TYPESCRIPT_SUPPORT_ERROR_CODES.has(error.code)
  ) {
    return error.code;
  }
}
