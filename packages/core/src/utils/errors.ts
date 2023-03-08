import { BigNumber } from "ethers";
import { HardhatPluginError } from "hardhat/plugins";

export class IgnitionError extends HardhatPluginError {
  constructor(message: string) {
    super("ignition", message);
  }
}

export class IgnitionValidationError extends HardhatPluginError {
  constructor(message: string) {
    super("ignition", message);

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
   * This is a hack to workaround the stack manipulation
   * that `HardhatPluginError` does.
   *
   * @param f the function to hide all of the stacktrace above
   */
  public resetStackFrom(f: () => any) {
    Error.captureStackTrace(this, f);

    // the base custom error from HH stores off the stack
    // it uses to `_stack`, so we need to override this
    // as well ... even though it is private.
    (this as any)._stack = this.stack ?? "";
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
