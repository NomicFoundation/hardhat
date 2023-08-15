/**
 * All exceptions intenionally thrown with Ignition-core
 * extend this class.
 *
 * @alpha
 */
export class IgnitionError extends Error {
  constructor(message: string) {
    super(message);

    this.name = this.constructor.name;
  }
}

/**
 * This error class represents issue detected by Ignition-cores
 * validation phase on the user inputed module. Validation errors
 * capture the stack to the action within the offending module,
 * to enhance the locality of the validation error message.
 *
 * * @alpha
 */
export class IgnitionValidationError extends IgnitionError {
  constructor(message: string) {
    super(message);

    // This is required to allow calls to `resetStackFrom`,
    // otherwise the function is not available on the
    // error instance
    Object.setPrototypeOf(this, new.target.prototype);
  }

  /**
   * Reset the stack hiding parts that are bellow the given function.
   * The intention is the function should be part of the user callable
   * api, so that the stack leads directly to the line in the module
   * the user called (i.e. `m.contract(...)`)
   *
   * @param f - the function to hide all of the stacktrace above
   *
   * @internal
   */
  public resetStackFrom(f: () => any) {
    Error.captureStackTrace(this, f);
  }
}

/**
 * This error class is thrown in situations where Ignition
 * intentionally doesn't support a certain operation.
 *
 * @alpha
 */
export class UnsupportedOperationError extends IgnitionError {
  constructor(message: string) {
    super(message);
  }
}
