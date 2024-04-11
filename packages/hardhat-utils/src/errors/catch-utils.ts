/**
 * Ensures that the provided value is an instance of an error.
 *
 * @example
 * This function is meant to be used in a catch block to ensure that you caught the right error.
 *
 * ```ts
 * // Ensuring that you got an Error
 * try {
 *   mayThrow();
 * } catch (error) {
 *   ensureError(error);
 *   console.err(error.message);
 * }
 *
 * // Ensuring that you got a specific error
 * try {
 *   mayThrow();
 * } catch (error) {
 *   ensureError(error, MyError);
 *   console.err(error.myMessage());
 * }
 * ```
 *
 * @param thrown The value to check.
 * @param ErrorType The error type to check against.
 * @throws The value if its not an instance of the specified error type.
 */
export function ensureError<ErrorT extends Error>(
  thrown: unknown,
  ErrorType?: new (...args: any[]) => ErrorT,
): asserts thrown is ErrorT {
  if (ErrorType === undefined) {
    if (thrown instanceof Error) {
      return;
    }

    throw thrown;
  }

  if (thrown instanceof ErrorType) {
    return;
  }

  throw thrown;
}
