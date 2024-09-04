import path from "node:path";
import { fileURLToPath } from "node:url";

import chalk from "chalk";
import { diff as getDiff } from "jest-diff";

import { indent } from "./formatting.js";
import {
  cleanupTestFailError,
  isCancelledByParentError,
  isTestFileExecutionFailureError,
} from "./node-test-error-utils.js";

/**
 * This interface represents the result of parsing a single stack trace line,
 * e.g.: at Object.<anonymous> (file:///Users/user/project/test.js:1:1)
 */
interface StackReference {
  context: string | undefined;
  location: string;
  lineNumber: string | undefined;
  columnNumber: string | undefined;
}

export function formatError(error: Error): string {
  if (isCancelledByParentError(error)) {
    return (
      chalk.red("Test cancelled by parent error") +
      "\n" +
      chalk.gray(
        indent(
          "This test was cancelled due to an error in its parent suite/it or test/it, or in one of its before/beforeEach",
          4,
        ),
      )
    );
  }

  if (isTestFileExecutionFailureError(error)) {
    return (
      chalk.red(`Test file execution failed (exit code ${error.exitCode}).`) +
      "\n" +
      chalk.gray(indent("Did you forget to await a promise?", 4))
    );
  }

  error = cleanupTestFailError(error);

  return formatSingleError(error);
}

/**
 * This function takes an error and formats it into a human-readable string.
 *
 * The error is formatted as follows:
 * - The error message is the first line of the error stack if the stack
 *   contains the first line of the original error message, otherwise it's the
 *   the first line of the original error message. The error message is prefixed
 *   with the prefix, if provided. The error message is printed in red if it's
 *   the first error in the error chain, otherwise it's printed in grey.
 * - If the error is diffable (i.e. it has `actual` and `expected` properties),
 *   the diff is printed.
 * - The error stack is formatted as a series of references (lines starting with
 *   "at"). The location part of the stack is normalized. The stack is printed
 *   in grey, indented by 4 spaces.
 * - If the error has a cause, the cause is formatted in the same way,
 *   recursively. Formatting a cause increases the depth by 1. The formatted
 *   cause is printed in grey, indented by 2 spaces.
 * - If the error is an aggregate, all the errors in the aggregate are formatted
 *   in the same way, recursively. Then, they are printed in grey, indented by 2
 *   spaces.
 *
 * @param error - The error to format
 * @param prefix - A prefix to add to the error message
 * @param depth - The depth of the error in the error chain
 * @returns The formatted error
 */
function formatSingleError(
  error: Error,
  prefix: string = "",
  depth: number = 0,
): string {
  const stackLines = (error.stack ?? "").split("\n");

  let message = error.message.split("\n")[0];
  if (stackLines.length > 0 && stackLines[0].includes(message)) {
    message = stackLines[0];
  }
  message = message.replace(" [ERR_ASSERTION]", "").replace(/:$/, "");

  if (prefix !== "") {
    message = `[${prefix}]: ${message}`;
  }

  const diff = getErrorDiff(error);

  const stackReferences: StackReference[] = stackLines
    .map(parseStackLine)
    .filter((reference) => reference !== undefined);

  const stack = stackReferences.map(formatStackReference).join("\n");

  let formattedError = depth === 0 ? chalk.red(message) : chalk.grey(message);
  if (diff !== undefined) {
    formattedError += `\n${diff}\n`;
  }
  if (stack !== "") {
    formattedError += `\n${chalk.gray(indent(stack, 4))}`;
  }

  if (isAggregateError(error)) {
    // Only the first aggregate error in a chain survives serialization
    // This is why we can safely not increase the depth here
    const formattedErrors = error.errors
      .map((e) => indent(formatSingleError(e, "inner", depth), 2))
      .join("\n");
    return `${formattedError}\n${formattedErrors}`;
  }

  if (error.cause instanceof Error) {
    const formattedCause = indent(
      formatSingleError(error.cause, "cause", depth + 1),
      2,
    );
    return `${formattedError}\n${formattedCause}`;
  }

  return formattedError;
}

function isAggregateError(error: Error): error is Error & { errors: Error[] } {
  return "errors" in error && Array.isArray(error.errors);
}

function isDiffableError(
  error: Error,
): error is Error & { actual: any; expected: any } {
  return (
    "expected" in error && "actual" in error && error.expected !== undefined
  );
}

function getErrorDiff(error: Error): string | undefined {
  if (!isDiffableError(error)) {
    return undefined;
  }

  if ("showDiff" in error && error.showDiff === false) {
    return undefined;
  }

  return getDiff(error.expected, error.actual) ?? undefined;
}

/**
 * This function parses a single stack trace line and returns the parsed
 * reference or undefined.
 *
 * Parsable stack trace lines are of the form:
 * - at <context> (<location>:<lineNumber>:<columnNumber>)
 * - at <context> (<location>:<lineNumber>)
 * - at <context> (<location>)
 * - at <location>:<lineNumber>:<columnNumber>
 * - at <location>:<lineNumber>
 * - at <location>
 *
 * @param line
 * @returns
 */
export function parseStackLine(line: string): StackReference | undefined {
  const regex = /^at (?:(.+?) \()?(?:([^\(].+?)(?::(\d+))?(?::(\d+))?)\)?$/;
  const match = line.trim().match(regex);

  if (match === null) {
    return undefined;
  }

  const [_, context, location, lineNumber, columnNumber] = match;

  return { context, location, lineNumber, columnNumber };
}

export function formatStackReference(reference: StackReference): string {
  let result = "at ";

  if (reference.context !== undefined) {
    result = `${result}${reference.context} (`;
  }

  const location = formatLocation(reference.location);
  result = `${result}${location}`;

  if (reference.lineNumber !== undefined) {
    result = `${result}:${reference.lineNumber}`;
  }
  if (reference.columnNumber !== undefined) {
    result = `${result}:${reference.columnNumber}`;
  }

  if (reference.context !== undefined) {
    result = `${result})`;
  }

  return result;
}

/**
 * This functions normlizes a location string by:
 * - Turning file URLs into file paths
 * - Turning absolute paths into relative paths if they are inside the current
 *   working directory
 *
 * @param location - The location string to format
 * @param cwd - The current working directory, exposed for testing
 * @param sep - The path separator, exposed for testing
 * @param windows - Whether the platform is windows, exposed for testing
 * @returns The formatted location string
 */
export function formatLocation(
  location: string,
  cwd: string = process.cwd(),
  sep: string = path.sep,
  windows: boolean = process.platform === "win32",
): string {
  if (location.startsWith("node:")) {
    return location;
  }
  if (location === "<anonymous>") {
    return location;
  }
  const locationPath = location.startsWith("file://")
    ? fileURLToPath(location, { windows })
    : location;
  return locationPath.replace(`${cwd}${sep}`, "");
}
