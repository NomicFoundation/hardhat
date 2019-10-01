import { assert, AssertionError, expect } from "chai";

import { BuidlerError } from "../../src/internal/core/errors";
import { ErrorDescriptor } from "../../src/internal/core/errors-list";

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
        notExactMatch.message += `${err.message}"`;
        throw notExactMatch;
      }
    } else {
      if (errorMessage.exec(err.message) === null) {
        notRegexpMatch.message += `${err.message}"`;
        throw notRegexpMatch;
      }
    }

    return;
  }

  throw noError;
}

export function expectBuidlerError(
  f: () => any,
  errorDescriptor: ErrorDescriptor,
  errorMessage?: string | RegExp
) {
  try {
    f();
  } catch (error) {
    assert.instanceOf(error, BuidlerError);
    assert.equal(error.number, errorDescriptor.number);
    assert.notInclude(
      error.message,
      "%s",
      "BuidlerError has old-style format tag"
    );
    assert.notMatch(
      error.message,
      /%[a-zA-Z][a-zA-Z0-9]*%/,
      "BuidlerError has an non-replaced variable tag"
    );

    if (typeof errorMessage === "string") {
      assert.include(error.message, errorMessage);
    } else if (errorMessage !== undefined) {
      assert.match(error.message, errorMessage);
    }

    return;
  }

  throw new AssertionError(
    `BuidlerError number ${errorDescriptor.number} expected, but no Error was thrown`
  );
}

export async function expectBuidlerErrorAsync(
  f: () => Promise<any>,
  errorDescriptor: ErrorDescriptor,
  errorMessage?: string | RegExp
) {
  // We create the error here to capture the stack trace before the await.
  // This makes things easier, at least as long as we don't have async stack
  // traces. This may change in the near-ish future.
  const error = new AssertionError(
    `BuidlerError number ${errorDescriptor.number} expected, but no Error was thrown`
  );

  const notExactMatch = new AssertionError(
    `BuidlerError was correct, but should have include "${errorMessage}" but got "`
  );

  const notRegexpMatch = new AssertionError(
    `BuidlerError was correct, but should have matched regex ${errorMessage} but got "`
  );

  try {
    await f();
  } catch (error) {
    assert.instanceOf(error, BuidlerError);
    assert.equal(error.number, errorDescriptor.number);
    assert.notInclude(
      error.message,
      "%s",
      "BuidlerError has old-style format tag"
    );
    assert.notMatch(
      error.message,
      /%[a-zA-Z][a-zA-Z0-9]*%/,
      "BuidlerError has an non-replaced variable tag"
    );

    if (errorMessage !== undefined) {
      if (typeof errorMessage === "string") {
        if (!error.message.includes(errorMessage)) {
          notExactMatch.message += `${error.message}`;
          throw notExactMatch;
        }
      } else {
        if (errorMessage.exec(error.message) === null) {
          notRegexpMatch.message += `${error.message}`;
          throw notRegexpMatch;
        }
      }
    }

    return;
  }

  throw error;
}
