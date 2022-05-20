import { emitWithArgs, EMIT_CALLED } from "./emit";
import {
  revertedWithCustomErrorWithArgs,
  REVERTED_WITH_CUSTOM_ERROR_CALLED,
} from "./reverted/revertedWithCustomError";

export function supportWithArgs(
  Assertion: Chai.AssertionStatic,
  utils: Chai.ChaiUtils
) {
  Assertion.addMethod("withArgs", function (this: any, ...expectedArgs: any[]) {
    if (this.__flags.negate) {
      throw new Error("Do not combine .not. with .withArgs()");
    }

    const emitCalled = utils.flag(this, EMIT_CALLED) === true;
    const revertedWithCustomErrorCalled =
      utils.flag(this, REVERTED_WITH_CUSTOM_ERROR_CALLED) === true;

    if (!emitCalled && !revertedWithCustomErrorCalled) {
      throw new Error(
        "withArgs called without a previous .emit or .revertedWithCustomError assertion"
      );
    }
    if (emitCalled && revertedWithCustomErrorCalled) {
      throw new Error(
        "withArgs called with both .emit and .revertedWithCustomError, these assertions cannot be combined"
      );
    }

    const promise = this.then === undefined ? Promise.resolve() : this;

    const derivedPromise = promise.then(() => {
      if (emitCalled) {
        return emitWithArgs(this, Assertion, utils, expectedArgs);
      } else {
        return revertedWithCustomErrorWithArgs(
          this,
          Assertion,
          utils,
          expectedArgs
        );
      }
    });

    this.then = derivedPromise.then.bind(derivedPromise);
    this.catch = derivedPromise.catch.bind(derivedPromise);
    return this;
  });
}
