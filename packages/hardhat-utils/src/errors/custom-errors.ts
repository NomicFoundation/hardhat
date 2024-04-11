export type NodeJSError = Error & NodeJS.ErrnoException;

/**
 * Abstract custom error class, which inherits from the built-in Error class,
 * making sure that the standard errror properties are set, and the stack trace
 * is not polluted with the custom error class' code.
 *
 * This class supports the `cause` property, which can be used to pass the
 * original error that caused the custom error to be thrown. Note that it needs
 * to be an instance of the built-in Error class, or a subclass of it. See `ensureError`
 * for a convinient way of using it.
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
    super(message, { cause });
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class HardhatUtilsError extends CustomError {}

export function assertHardhatUtilsInvariant(
  invariant: boolean,
  message: string,
): asserts invariant {
  if (!invariant) {
    throw new HardhatUtilsError(message);
  }
}
