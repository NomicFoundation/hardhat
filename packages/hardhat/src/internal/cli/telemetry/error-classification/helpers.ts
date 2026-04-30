export enum FrameOrigin {
  FIRST_PARTY = "FIRST_PARTY",
  THIRD_PARTY = "THIRD_PARTY",
  USER_PROJECT = "USER_PROJECT",
  NODE_INTERNAL = "NODE_INTERNAL",
  OTHER = "OTHER",
}

export interface StackFrame {
  functionName?: string;
  location: string;
  origin: FrameOrigin;
}

/**
 * The error context encapsulates the shared derived data used by classification
 * and filtering.
 */
export interface ErrorContext {
  error: Error;
  errorChain: Error[];
  lowercaseMessageByError: Map<Error, string>;
  stackFramesByError: Map<Error, StackFrame[]>;
  allStackFrames: StackFrame[];
}

/**
 * Builds the shared derived data used by classification and filtering.
 *
 * This keeps stack parsing and cause-chain traversal consistent across
 * matchers, and avoids recomputing them for every category heuristic.
 */
export function createErrorContext(error: Error): ErrorContext {
  const errorChain = getErrorChain(error);
  const stackFramesByError = new Map(
    errorChain.map((candidate) => [candidate, parseStackFrames(candidate)]),
  );

  return {
    error,
    errorChain,
    lowercaseMessageByError: new Map(
      errorChain.map((candidate) => [candidate, candidate.message.toLowerCase()]),
    ),
    stackFramesByError,
    allStackFrames: errorChain.flatMap(
      (candidate) => stackFramesByError.get(candidate) ?? [],
    ),
  };
}

/**
 * This function should be used instead of instanceof because it is robust
 * under the presence of multiple installations of the same package (e.g.
 * multiple hardhat-utils versions).
 *
 * @param error The error
 * @param errorClass The error class
 * @returns true if the error has the same name as the error class
 */
export function hasErrorClassName(
  error: Error,
  errorClass: abstract new (...args: never[]) => Error,
): boolean {
  return error.name === errorClass.name;
}

/**
 * Returns true when `value` contains any of the supplied substrings.
 */
export function includesAny(
  value: string | undefined,
  ...substrings: string[]
): boolean {
  return (
    value !== undefined &&
    substrings.some((substring) => value.includes(substring))
  );
}

/**
 * Returns a Node-style `code` string from an error or any Error cause.
 *
 * Traversal stops when a cause is not an Error, a cycle is detected, or
 * `maxCauseDepth` is reached.
 */
export function getNodeErrorCode(
  error: Error,
  maxCauseDepth = 10,
): string | undefined {
  const seen = new Set<Error>();
  let current: Error | undefined = error;
  let depth = 0;

  while (current !== undefined && depth < maxCauseDepth && !seen.has(current)) {
    if ("code" in current && typeof current.code === "string") {
      return current.code;
    }

    seen.add(current);
    current = getCause(current);
    depth++;
  }
}

/**
 * Returns the error and its nested causes in outer-to-inner order.
 *
 * Traversal stops when a cause is not an Error, a cycle is detected, or
 * `maxCauseDepth` is reached.
 */
function getErrorChain(error: Error, maxCauseDepth = 10): Error[] {
  const errors: Error[] = [];
  const seen = new Set<Error>();

  let current: Error | undefined = error;
  while (
    current !== undefined &&
    errors.length < maxCauseDepth &&
    seen.has(current) === false
  ) {
    errors.push(current);
    seen.add(current);

    if (current.cause !== undefined && !(current.cause instanceof Error)) {
      break;
    }

    current = getCause(current);
  }

  return errors;
}

/**
 * Parses V8-style stack lines into normalized stack frames.
 *
 * Unrecognized lines are ignored, and path separators are normalized to `/`
 * before the frame origin is inferred.
 */
function parseStackFrames(error: Error): StackFrame[] {
  if (error.stack === undefined) {
    return [];
  }

  return error.stack
    .split("\n")
    .slice(1)
    .map((line) => line.trim())
    .map(parseStackFrameLine)
    .filter((frame): frame is StackFrame => frame !== undefined);
}

/**
 * Parses a single V8 stack frame line.
 */
function parseStackFrameLine(line: string): StackFrame | undefined {
  const match =
    line.match(/^at (?:(.+?) \()?(.+?):\d+:\d+\)?$/) ??
    line.match(/^at (?:(.+?) \()?(.+?)\)?$/);

  if (match === null || match[2] === undefined) {
    return;
  }

  const functionName = match[1] === undefined ? undefined : match[1].trim();
  const location = normalizeLocation(match[2]);

  return {
    functionName,
    location,
    origin: getFrameOrigin(location),
  };
}

/**
 * Returns the Error-valued cause of an error, ignoring non-Error causes.
 */
function getCause(error: Error): Error | undefined {
  if ("cause" in error && error.cause instanceof Error) {
    return error.cause;
  }
}

/**
 * Normalizes Windows paths and file URLs enough for substring-based matchers.
 */
function normalizeLocation(location: string): string {
  return location.replaceAll("\\", "/");
}

/**
 * Infers who owns a stack frame from its normalized location.
 */
function getFrameOrigin(location: string): FrameOrigin {
  if (
    startsWithAny(location, "node:", "internal/") ||
    includesAny(location, "node:internal/")
  ) {
    return FrameOrigin.NODE_INTERNAL;
  }

  if (location.includes("/node_modules/")) {
    if (
      includesAny(
        location,
        "/node_modules/hardhat/",
        "/node_modules/@nomicfoundation/",
      )
    ) {
      return FrameOrigin.FIRST_PARTY;
    }

    return FrameOrigin.THIRD_PARTY;
  }

  if (
    startsWithAny(location, "/", "file://", "[eval]") ||
    /^[A-Za-z]:\//.test(location)
  ) {
    return FrameOrigin.USER_PROJECT;
  }

  return FrameOrigin.OTHER;
}

/**
 * Returns true when `value` starts with any of the supplied prefixes.
 */
function startsWithAny(value: string, ...prefixes: string[]): boolean {
  return prefixes.some((prefix) => value.startsWith(prefix));
}
