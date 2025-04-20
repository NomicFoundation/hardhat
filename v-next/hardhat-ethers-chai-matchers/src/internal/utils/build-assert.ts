import type { Ssfi } from "./ssfi.js";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import { AssertionError } from "chai";

/**
 * This function is used by the matchers to obtain an `assert` function, which
 * should be used instead of `this.assert`.
 *
 * The first parameter is the value of the `negated` flag. Keep in mind that
 * this value should be captured at the beginning of the matcher's
 * implementation, before any async code is executed. Otherwise things like
 * `.to.emit().and.not.to.emit()` won't work, because by the time the async part
 * of the first emit is executed, the `.not` (executed synchronously) has already
 * modified the flag.
 *
 * The second parameter is what Chai calls the "start stack function indicator",
 * a function that is used to build the stack trace. It's unclear to us what's
 * the best way to use this value, so this needs some trial-and-error. Use the
 * existing matchers for a reference of something that works well enough.
 */
export function buildAssert(negated: boolean, ssfi: Ssfi) {
  return function (
    condition: boolean,
    messageFalse?: string | (() => string),
    messageTrue?: string | (() => string),
  ): void {
    if (!negated && !condition) {
      if (messageFalse === undefined) {
        throw new HardhatError(
          HardhatError.ERRORS.CHAI_MATCHERS.GENERAL.ASSERTION_WITHOUT_ERROR_MESSAGE,
        );
      }

      const message =
        typeof messageFalse === "function" ? messageFalse() : messageFalse;
      // eslint-disable-next-line no-restricted-syntax -- keep the original chai error structure
      throw new AssertionError(message, undefined, ssfi);
    }

    if (negated && condition) {
      if (messageTrue === undefined) {
        throw new HardhatError(
          HardhatError.ERRORS.CHAI_MATCHERS.GENERAL.ASSERTION_WITHOUT_ERROR_MESSAGE,
        );
      }

      const message =
        typeof messageTrue === "function" ? messageTrue() : messageTrue;
      // eslint-disable-next-line no-restricted-syntax -- keep the original chai error structure
      throw new AssertionError(message, undefined, ssfi);
    }
  };
}
