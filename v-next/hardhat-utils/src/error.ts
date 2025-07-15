/**
 * Abstract custom error class, which inherits from the built-in Error class,
 * making sure that the standard error properties are set, and the stack trace
 * is not polluted with the custom error class' code.
 *
 * This class supports the `cause` property, which can be used to pass the
 * original error that caused the custom error to be thrown. Note that it needs
 * to be an instance of the built-in Error class, or a subclass of it. See `ensureError`
 * for a convenient way of using it.
 *
 * @example
 * ```ts
 * class MyCustomError extends CustomError {
 * }
 *
 * try {
 *   mayThrow();
 * } catch (error) {
 *   ensureError(error);
 *   throw new MyCustomError('Something went wrong', error);
 * }
 * ```
 */
export abstract class CustomError extends Error {
  public override stack!: string;

  constructor(message: string, cause?: Error) {
    super(message, cause !== undefined ? { cause } : undefined);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

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

/**
 * Ensures that the provided value is a NodeJS.ErrnoException with a string 'code'.
 * @param thrown The value to check.
 * @throws The value if its not an error or if it doesn't have a code property.
 * @example
 * ```ts
 * try {
 *   await fs.promises.readFile("non-existing-file.txt");
 * } catch (error) {
 *   ensureNodeErrnoExceptionError(error);
 *   console.error(error.code);
 * }
 * ```
 */
export function ensureNodeErrnoExceptionError(
  thrown: unknown,
): asserts thrown is NodeJS.ErrnoException & Error & { code: string } {
  ensureError(thrown);

  if (!("code" in thrown) || typeof thrown.code !== "string") {
    throw thrown;
  }
}

/**
 * Throws an error for an unreachable code path. This function is typically
 * used in a default case of a switch statement where all possible values of
 * the switched variable should be handled in other cases. If the default case
 * is reached, it means that an unexpected value was encountered, so an error
 * is thrown.
 *
 * Note: The `@typescript-eslint/switch-exhaustiveness-check` rule checks for
 * exhaustiveness in switch statements by comparing the types of the switch
 * expression and the case clauses. However, it only works with union types and
 * enum types. If you're switching on the result of the `typeof` operator or
 * any other expression that doesn't return a union type or an enum type, this
 * rule cannot enforce exhaustiveness. In such cases, you can use this function
 * in the default case to ensure that an error is thrown if an unexpected value
 * is encountered.
 *
 * @param _value The unexpected value. This parameter is unused and is only for
 * the purpose of type checking.
 * @param error The error to throw.
 * @returns This function never returns normally. It always throws an error.
 * @throws Will throw an error when called.
 */
export function unreachable(_value: never, error: Error): never {
  throw error;
}
