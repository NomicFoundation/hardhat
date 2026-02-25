import { fileURLToPath } from "node:url";

import { CustomError } from "@nomicfoundation/hardhat-utils/error";
import { shortenPath } from "@nomicfoundation/hardhat-utils/path";
import chalk from "chalk";

export class UsingHardhat2PluginError extends CustomError {
  public readonly callerRelativePath: string | undefined;
  constructor() {
    const callerPath = getCallerRelativePath();

    let message: string;
    if (callerPath !== undefined) {
      message = `You are trying to use a Hardhat 2 plugin in a Hardhat 3 project.

This file is part of a Hardhat 2 plugin calling an API that was removed in Hardhat 3: ${chalk.bold(callerPath)}

Please read https://hardhat.org/migrate-from-hardhat2 to learn how to migrate your project to Hardhat 3.
`;
    } else {
      message = `You are trying to use a Hardhat 2 plugin in a Hardhat 3 project.
      
Check the stack trace below to identify which plugin is causing this.

Please read https://hardhat.org/migrate-from-hardhat2 to learn how to migrate your project to Hardhat 3.
`;
    }

    super(message);
    this.callerRelativePath = callerPath;
  }
}

/**
 * Returns the relative path of the file that called a deprecated Hardhat
 * plugin API, based on the stack trace. This helps identify which plugin
 * file is triggering usage of Hardhat 2 APIs in a Hardhat 3 project.
 *
 * @param {number} [depth=5] The stack trace depth to locate the caller's
 * source file. By default, depth 5 is used because:
 *   0 = message
 *   1 = getCallerRelativePath
 *   2 = UsingHardhat2PluginError constructor
 *   3 = throwUsingHardhat2PluginError
 *   4 = deprecated function
 *   5 = actual caller (the plugin file)
 *
 * @returns {string|undefined} The shortened relative path of the caller file,
 * or undefined if not found.
 *
 * @example
 * If the stack trace is:
 * // Error
 * //     at getCallerRelativePath (src/internal/using-hardhat2-plugin-errors.ts:34:15)
 * //     at UsingHardhat2PluginError.constructor (src/internal/using-hardhat2-plugin-errors.ts:7:3)
 * //     at throwUsingHardhat2PluginError (src/internal/using-hardhat2-plugin-errors.ts:90:3)
 * //     at deprecatedFunction (plugins/example-plugin/deprecated.js:50:10)
 * //     at main (plugins/example-plugin/index.js:100:5)
 * Calling getCallerRelativePath() returns 'plugins/example-plugin/index.js'
 */
export function getCallerRelativePath(depth: number = 5): string | undefined {
  try {
    const stack = new Error().stack;
    if (stack === undefined) {
      return undefined;
    }

    const lines = stack.split("\n");
    const callerLine = lines[depth];
    if (callerLine === undefined) {
      return undefined;
    }

    /**
     * Matches a single stack trace line:
     *
     * at FunctionName (path/to/file.ts:10:5)
     * at path/to/file.ts:10:5
     *
     * Captures:
     *  - group 1: file location (without line/column)
     */
    const STACK_TRACE_LINE_REGEX =
      /^at (?:.+? \()?([^\(].*?)(?::\d+)?(?::\d+)?\)?$/;

    const match = callerLine.trim().match(STACK_TRACE_LINE_REGEX);
    if (match === null || match[1] === undefined) {
      return undefined;
    }

    let filePath = match[1];

    // Handle file:// URLs from ESM stack traces
    if (filePath.startsWith("file://")) {
      filePath = fileURLToPath(filePath);
    }

    return shortenPath(filePath);
  } catch {
    return undefined;
  }
}

export function throwUsingHardhat2PluginError(): never {
  /* eslint-disable-next-line no-restricted-syntax -- Intentionally throwing a
    custom error here so that we always print the stack trace */
  throw new UsingHardhat2PluginError();
}
