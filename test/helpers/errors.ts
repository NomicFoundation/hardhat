import { assert, AssertionError, expect } from "chai";

import { BuidlerError, ErrorDescription } from "../../src/core/errors";

export async function expectErrorAsync(
  f: () => Promise<any>,
  errorMessage?: string | RegExp
) {
  const noError = new AssertionError("Async error expected but not thrown");

  try {
    await f();
  } catch (err) {
    if (errorMessage === undefined) {
      return;
    }

    if (typeof errorMessage === "string") {
      assert.equal(err.message, errorMessage);
    } else {
      assert.match(err.message, errorMessage);
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
