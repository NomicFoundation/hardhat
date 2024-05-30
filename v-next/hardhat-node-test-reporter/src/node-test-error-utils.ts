/**
 * Returns true if the error represents that a test/suite failed because one of
 * its subtests failed.
 */
export function isSubtestFailedError(error: Error): boolean {
  return (
    "code" in error &&
    "failureType" in error &&
    error.code === "ERR_TEST_FAILURE" &&
    error.failureType === "subtestsFailed"
  );
}

/**
 * Returns true if the error represents that a test was cancelled because its
 * parent failed.
 */
export function isCancelledByParentError(error: Error): boolean {
  return (
    "code" in error &&
    "failureType" in error &&
    error.code === "ERR_TEST_FAILURE" &&
    error.failureType === "cancelledByParent"
  );
}

/**
 * Cleans the test:fail event error, as it's usually wrapped by a node:test
 * error.
 */
export function cleanupTestFailError(error: Error): Error {
  if (
    "code" in error &&
    error.code === "ERR_TEST_FAILURE" &&
    error.cause instanceof Error
  ) {
    return error.cause;
  }

  return error;
}
