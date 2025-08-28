import path from "node:path";
import { fileURLToPath } from "node:url";
import { stripVTControlCharacters } from "node:util";

import chalk from "chalk";
import { diff as getDiff } from "jest-diff";

import { indent } from "./formatting.js";
import {
  cleanupTestFailError,
  isTestFileExecutionFailureError,
} from "./node-test-error-utils.js";
import { isCi } from "./ci.js";

const AGGREGATE_ERROR_INNER_ERROR_INDENT = 2;
const ERROR_CAUSE_INDENT = 2;
const ERROR_STACK_INDENT = 4;
const MAX_ERROR_CHAIN_LENGTH = isCi() ? 100 : 5;

/**
 * Represents the result of successful parsing of a stack trace line.
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

/**
 * Represents the result of attempting to parse a stack trace line. It consists
 * of the original stack trace line and the parsed stack reference, if successful.
 */
interface StackLine {
  line: string;
  reference: StackReference | undefined;
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
export function formatSingleError(
  error: Error,
  prefix: string = "",
  depth: number = 0,
): string {
  const parsedStackLines = (error.stack?.split("\n") ?? []).map(parseStackLine);

  // Finds the first line which has a stack reference
  const firstLineWithReferenceIndex = parsedStackLines.findIndex(
    (line) => line.reference !== undefined,
  );

  // Finds the last line which does not have a node stack reference
  const lastNonNodeLineIndex = parsedStackLines.findLastIndex(
    (line) => !isNodeLine(line),
  );

  // This is a subset of parsed stack lines that belong to the message
  let messageLines: StackLine[];
  if (firstLineWithReferenceIndex === -1) {
    // If none of the lines have a reference, then they all belong to the message
    messageLines = parsedStackLines;
  } else {
    // Otherwise, the message consists of the lines before the first line with a reference
    messageLines = parsedStackLines.slice(0, firstLineWithReferenceIndex);
  }
  let message = messageLines.map(formatStackLine).join("\n");

  // If the message from the stack does not contain the original error message,
  // we use the original error message instead
  if (!message.includes(error.message)) {
    message = error.message;
  }

  // We remove the node:assert and node:test error codes
  message = message
    .replace(" [ERR_ASSERTION]", "")
    .replace(" [ERR_TEST_FAILURE]", "");

  const diff = getErrorDiff(error);
  message = stripVTControlCharacters(message);

  // If we detect a falsy expression error message, we remove any extra information
  // as it is unreliable; see https://github.com/NomicFoundation/hardhat/issues/6608.
  // Otherwise, we try to remove any existing diff from the message.
  if (
    message.startsWith(
      "AssertionError: The expression evaluated to a falsy value:",
    )
  ) {
    message = "AssertionError: The expression evaluated to a falsy value";
  } else if (diff !== undefined) {
    // If we got a diff, we try to remove any diff from the message, which can
    // have different formats.

    // Format 1: A line starting with "+ actual - expected" or "actual expected".
    let match = message.match(/^(.*?)\n\s*?[\+\s]*actual[\s-]*expected/s);

    // Format 2: A line starting with "{error.actual} !==".
    if (match === null && "actual" in error) {
      match = message.match(/^(.*)\n\s*?(?:.*?) !==/s);
    }

    if (match !== null) {
      // The message may contain white spaces or newlines at the end, so we trim
      // it.
      message = match[1].trim();

      // It can also include a colon at the end (e.g. node:assert messages do),
      // so we remove it.
      message = message.replace(/:+$/, "");
    }
  }

  if (prefix !== "") {
    message = `[${prefix}]: ${message}`;
  }

  // This is a subset of parsed stack lines that belong to the stack
  let stackLines: StackLine[];
  if (firstLineWithReferenceIndex === -1) {
    // No lines have a stack reference, the stack is empty
    stackLines = [];
  } else {
    // Otherwise, the stack starts with the first line with a stack reference
    if (lastNonNodeLineIndex + 1 === firstLineWithReferenceIndex) {
      // All the lines after the start have a node stack reference, we show the whole stack
      stackLines = parsedStackLines.slice(firstLineWithReferenceIndex);
    } else {
      // Otherwise, the stack ends with the last line without a node stack reference
      stackLines = parsedStackLines.slice(
        firstLineWithReferenceIndex,
        lastNonNodeLineIndex + 1,
      );
    }
  }
  const stack = stackLines.map(formatStackLine).join("\n");

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

  if (typeof error.expected !== typeof error.actual) {
    return undefined;
  }

  return getDiff(error.expected, error.actual) ?? undefined;
}

/**
 * This function parses a single stack trace line. It attempts to extract a
 * stack reference from the line, and returns a parsed StackLine.
 *
 * Stack trace lines from which a reference can be extracted are of the form:
 * - at <context> (<location>:<lineNumber>:<columnNumber>)
 * - at <context> (<location>:<lineNumber>)
 * - at <context> (<location>)
 * - at <location>:<lineNumber>:<columnNumber>
 * - at <location>:<lineNumber>
 * - at <location>
 */
export function parseStackLine(line: string): StackLine {
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

  let reference: StackReference | undefined;

  if (match !== null) {
    const [_, context, location, lineNumber, columnNumber] = match;
    reference = { context, location, lineNumber, columnNumber };
  }

  return { line, reference };
}

export function formatStackLine({ line, reference }: StackLine): string {
  if (reference === undefined) {
    return line;
  }

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
  const locationPath = location.startsWith("file://")
    ? fileURLToPath(location, { windows })
    : location;
  if (locationPath.startsWith(`${cwd}${sep}`)) {
    return locationPath.slice(cwd.length + 1);
  } else {
    return locationPath;
  }
}

/**
 * Returns true if the stack line is a node line.
 *
 * A node line is a line that has a node stack reference, i.e. its location
 * starts with "node:" or "async node:", or its context is for a node type.
 */
function isNodeLine({ reference }: StackLine): boolean {
  if (reference === undefined) {
    return false;
  }

  return hasNodeLocation(reference) || hasNodeContext(reference);
}

function hasNodeLocation({ location }: StackReference): boolean {
  return location.startsWith("node:") || location.startsWith("async node:");
}

function hasNodeContext({ context }: StackReference): boolean {
  if (context === undefined) {
    return false;
  }

  // This is a list of types that we consider to be node types for the purpose
  // of detecting node stack references. It should be expanded as needed.
  const nodeTypes = ["Array", "Promise", "SafePromise"];

  const regex = new RegExp(
    "^" + // Matches the beginning of the line
      "(?:" + // Opens a non-capturing group
      "(.+?)" + // Lazily captures the modifier as 1 or more characters
      " " + // Matches the string " "
      ")?" + // Closes the non-capturing group and makes it optional
      `(${nodeTypes.join("|")})` + // Matches the string that is one of the node types
      "(?:" + // Opens a non-capturing group
      "\\." + // Matches the string "."
      "(.+?)" + // Lazily captures a method as 1 or more characters
      ")*" + // Closes the non-capturing group; it can match 0 or more times
      "$", // Matches the end of the line
  );

  return regex.test(context);
}
