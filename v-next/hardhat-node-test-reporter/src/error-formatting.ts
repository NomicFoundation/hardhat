import path from "node:path";
import { fileURLToPath } from "node:url";

import chalk from "chalk";
import { diff as getDiff } from "jest-diff";

import { indent } from "./formatting.js";
import {
  cleanupTestFailError,
  isTestFileExecutionFailureError,
} from "./node-test-error-utils.js";

const AGGREGATE_ERROR_INNER_ERROR_INDENT = 2;
const ERROR_CAUSE_INDENT = 2;
const ERROR_STACK_INDENT = 4;
const MAX_ERROR_CHAIN_LENGTH = 3;

/**
 * Represents the result of parsing a single stack trace line.
 *
 * Example of a complete stack trace line:
 * `at Object.<anonymous> (file:///Users/user/project/test.js:20:34)`
 *
 * The `context` field indicates the namespace or function context in which the error occurred, if available.
 * Example: `Object.<anonymous>`
 *
 * The `location` field specifies the URI or path of the file where the error occurred.
 * Example: `file:///Users/user/project/test.js`
 *
 * The `lineNumber` and `columnNumber` fields represent the exact position within the file, if available.
 * Example: `20` (line number), `34` (column number)
 */
interface StackReference {
  context: string | undefined;
  location: string;
  lineNumber: string | undefined;
  columnNumber: string | undefined;
}

export function formatError(error: Error): string {
  if (isTestFileExecutionFailureError(error)) {
    return chalk.red(
      `Test file execution failed (exit code ${error.exitCode}).`,
    );
  }

  error = cleanupTestFailError(error);

  return formatSingleError(error);
}

/**
 * This function takes an error and formats it into a human-readable string.
 *
 * The error is formatted as follows:
 * - The error message is the beginning of the error stack up to the first
 *   line that starts with "at" if it contains the original error message.
 *   Otherwise, the original error message is used as is. The error message is
 *   prefixed with the prefix, if provided. The error message is printed in red
 *   if it's the first error in the error chain, otherwise it's printed in grey.
 *   The following strings are removed from the error message:
 *   - "[ERR_ASSERTION]"
 *   - "[ERR_TEST_FAILURE]"
 * - If the error is diffable (i.e. it has `actual` and `expected` properties),
 *   the diff is printed.
 * - The error stack is formatted as a series of references (lines starting with
 *   "at"). All the node references and test runner internal references are
 *   removed. The location part of the stack is normalized. The stack is printed
 *   in grey, indented by 4 spaces.
 * - If the error has a cause, the cause is formatted in the same way,
 *   recursively. Formatting a cause increases the depth by 1. If the depth is
 *   greater than 3, the cause is replaced by an error indicating that the error
 *   chain has been truncated. The formatted cause is printed in grey, indented
 *   by 2 spaces.
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
  const messageLines = [];
  const stackLines = [];
  const nodeLines = [];

  for (const line of error.stack?.split("\n") ?? []) {
    const reference = parseStackLine(line);
    if (reference === undefined) {
      if (stackLines.length === 0 && nodeLines.length === 0) {
        messageLines.push(line);
      } else {
        stackLines.push(line);
      }
    } else {
      const formattedStackReference = formatStackReference(reference);
      // Put all the node references on a separate stack. If we don't encounter
      // any non-node references after that, we will discard them
      if (isNodeLocation(reference.location)) {
        // Check if the location is strictly a node location if the node stack
        // is empty. Otherwise, it is OK to accept <anonymous> and index locations
        if (nodeLines.length > 0 || isNodeLocation(reference.location, true)) {
          nodeLines.push(formattedStackReference);
        } else {
          stackLines.push(formattedStackReference);
        }
      } else {
        // If we encounter a non-node location, we put all the node references
        // on the main stack because we want to display them to the user
        while (nodeLines.length > 0) {
          stackLines.push(nodeLines.shift());
        }
        stackLines.push(formattedStackReference);
      }
    }
  }

  // If the main stack is empty, we display all the node references to the user
  if (stackLines.length === 0) {
    while (nodeLines.length > 0) {
      stackLines.push(nodeLines.shift());
    }
  }

  let message = messageLines.join("\n");

  if (!message.includes(error.message)) {
    message = error.message;
  }
  message = message
    .replace(" [ERR_ASSERTION]", "")
    .replace(" [ERR_TEST_FAILURE]", "");

  if (prefix !== "") {
    message = `[${prefix}]: ${message}`;
  }

  const diff = getErrorDiff(error);

  const stack = stackLines.join("\n");

  let formattedError = depth === 0 ? chalk.red(message) : chalk.grey(message);
  if (diff !== undefined) {
    formattedError += `\n${diff}\n`;
  }
  if (stack !== "") {
    formattedError += `\n${chalk.gray(indent(stack, ERROR_STACK_INDENT))}`;
  }

  if (isAggregateError(error)) {
    // node:test only passes on/serializes top-level aggregate errors
    // If an aggregate error is nested as the cause of another error, then
    // node:test will drop it altogether. If an aggregate error is nested
    // as an inner error of another aggregate error, then node:test will
    // serialize the nested aggregate error as a single/simple error.
    // Because of this, we do not need to increase the depth here.
    const formattedErrors = error.errors
      .map((e) =>
        indent(
          formatSingleError(e, "inner", depth),
          AGGREGATE_ERROR_INNER_ERROR_INDENT,
        ),
      )
      .join("\n");
    return `${formattedError}\n${formattedErrors}`;
  }

  if (error.cause instanceof Error) {
    let cause = error.cause;
    if (depth + 1 >= MAX_ERROR_CHAIN_LENGTH) {
      cause = new Error(
        `The error chain has been truncated because it's too long (limit: ${MAX_ERROR_CHAIN_LENGTH})`,
      );
      cause.stack = undefined;
    }
    const formattedCause = indent(
      formatSingleError(cause, "cause", depth + 1),
      ERROR_CAUSE_INDENT,
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
  const regex = new RegExp(
    [
      "^", // Matches the beginning of the line
      "at ", // Matches the string "at "
      "(?:", // Opens a non-capturing group
      "(.+?)", // Lazily captures the context as 1 or more characters
      " \\(", // Matches the string " ("
      ")?", // Closes the non-capturing group and makes it optional
      "(?:", // Opens a non-capturing group
      "([^\\(].*?)", // Lazily captures the location as 1 or more characters not starting with "("
      "(?:", // Opens a non-capturing group
      ":", // Matches the string ":"
      "(\\d+)", // Lazily captures the line number as 1 or more digits
      ")?", // Closes the non-capturing group and makes it optional
      "(?:", // Opens a non-capturing group
      ":", // Matches the string ":"
      "(\\d+)", // Lazily captures the column number as 1 or more digits
      ")?", // Closes the non-capturing group and makes it optional
      ")", // Closes the non-capturing group
      "\\)?", // Optionally matches the string ")"
      "$", // Matches the end of the line
    ].join(""),
  );
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
  if (isNodeLocation(location)) {
    return location;
  }
  const locationPath = location.startsWith("file://")
    ? fileURLToPath(location, { windows })
    : location;
  if (locationPath.startsWith(`${cwd}${sep}`)) {
    return locationPath.slice(cwd.length + 1);
  } else {
    return locationPath;
  }
}

function isNodeLocation(location: string, strict: boolean = false): boolean {
  const startsWithNode =
    location.startsWith("node:") || location.startsWith("async node:");
  if (strict) {
    return startsWithNode;
  } else {
    return (
      startsWithNode ||
      location === "<anonymous>" ||
      /^index \d+$/.test(location)
    );
  }
}
