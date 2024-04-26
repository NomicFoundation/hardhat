/**
 * Retrieves the current call stack.
 *
 * This function temporarily overrides `Error.prepareStackTrace` to return the
 * structured stack trace (an array of call site objects) instead of a string.
 * It then creates a new Error object to capture the current stack trace and
 * restores the original `Error.prepareStackTrace` function.
 *
 * @returns An array of call site objects representing the current call stack.
 */
export function getCurrentStack(): NodeJS.CallSite[] {
  const previousPrepareStackTrace = Error.prepareStackTrace;

  Error.prepareStackTrace = (_e, s) => s;

  const error = new Error();
  const stack: NodeJS.CallSite[] = error.stack as unknown as NodeJS.CallSite[];

  Error.prepareStackTrace = previousPrepareStackTrace;

  return stack;
}
