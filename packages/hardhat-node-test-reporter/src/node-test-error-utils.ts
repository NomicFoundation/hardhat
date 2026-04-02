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
 * Returns true if the error represents that an entire file execution failed,
 * outside of the context of any particular test.
 */
export function isTestFileExecutionFailureError(
  error: Error,
): error is Error & { exitCode: number } {
  return (
    "code" in error &&
    "failureType" in error &&
    error.code === "ERR_TEST_FAILURE" &&
    error.failureType === "testCodeFailure" &&
    "exitCode" in error &&
    typeof error.exitCode === "number" &&
    error.exitCode !== 0
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
