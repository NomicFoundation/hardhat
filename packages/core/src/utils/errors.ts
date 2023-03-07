import { BigNumber } from "ethers";

export class IgnitionError extends Error {
  constructor(message: string) {
    super(message);

    this.name = this.constructor.name;
  }
}

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
   * @param f the function to hide all of the stacktrace above
   */
  public resetStackFrom(f: () => any) {
    Error.captureStackTrace(this, f);
  }
}

export function assertStringParam(param: any, paramName: string) {
  if (typeof param !== "string") {
    throw new IgnitionError(`\`${paramName}\` must be a string`);
  }
}

export function assertFunctionParam(param: any, paramName: string) {
  if (typeof param !== "function") {
    throw new IgnitionError(`\`${paramName}\` must be a function`);
  }
}

export function assertBigNumberParam(param: any, paramName: string) {
  if (param !== undefined) {
    if (!BigNumber.isBigNumber(param)) {
      throw new IgnitionError(`\`${paramName}\` must be a BigNumber`);
    }
  }
}
