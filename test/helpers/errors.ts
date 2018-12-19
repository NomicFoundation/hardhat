import { assert, AssertionError, expect } from "chai";

import { BuidlerError, ErrorDescription } from "../../src/core/errors";

export async function expectErrorAsync(
  f: () => Promise<any>,
  errorMessage?: string | RegExp
) {
  const noError = new AssertionError("Async error expected but not thrown");
  const notExactMatch = new AssertionError(
    `Async error should have had message "${errorMessage}" but got "`
  );

  const notRegexpMatch = new AssertionError(
    `Async error should have matched regex ${errorMessage} but got "`
  );

  try {
    await f();
  } catch (err) {
    if (errorMessage === undefined) {
      return;
    }

    if (typeof errorMessage === "string") {
      if (err.message !== errorMessage) {
        notExactMatch.message += err.message + '"';
        throw notExactMatch;
      }
    } else {
      if (errorMessage.exec(err.message) === null) {
        notRegexpMatch.message += err.message + '"';
        throw notRegexpMatch;
      }
    }

    return;
  }

  throw noError;
}

export function expectBuidlerError(
  f: () => any,
  errorDescription: ErrorDescription
) {
  try {
    f();
  } catch (error) {
    assert.instanceOf(error, BuidlerError);
    assert.equal(error.number, errorDescription.number);
    assert.notInclude(error.message, "%s", "BuidlerError wrongly formatted");
    return;
  }

  throw new AssertionError(
    `BuidlerError number ${
      errorDescription.number
    } expected, but no Error was thrown`
  );
}

export async function expectBuidlerErrorAsync(
  f: () => Promise<any>,
  errorDescription: ErrorDescription
) {
  // We create the error here to capture the stack trace before the await.
  // This makes things easier, at least as long as we don't have async stack
  // traces. This may change in the near-ish future.
  const error = new AssertionError(
    `BuidlerError number ${
      errorDescription.number
    } expected, but no Error was thrown`
  );

  try {
    await f();
  } catch (error) {
    assert.instanceOf(error, BuidlerError);
    assert.equal(error.number, errorDescription.number);
    assert.notInclude(error.message, "%s", "BuidlerError wrongly formatted");
    return;
  }

  throw error;
}
