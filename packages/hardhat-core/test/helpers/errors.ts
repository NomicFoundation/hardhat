import { assert, AssertionError } from "chai";

import { HardhatError } from "../../src/internal/core/errors";
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

    if (err instanceof Error) {
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
    }

    return;
  }

  throw noError;
}

export function expectHardhatError(
  f: () => any,
  errorDescriptor: ErrorDescriptor,
  errorMessage?: string | RegExp
) {
  try {
    f();
  } catch (error: any) {
    assert.instanceOf(error, HardhatError);
    assert.equal(error.number, errorDescriptor.number);
    assert.notInclude(
      error.message,
      "%s",
      "HardhatError has old-style format tag"
    );
    assert.notMatch(
      error.message,
      /%[a-zA-Z][a-zA-Z0-9]*%/,
      "HardhatError has a non-replaced variable tag"
    );

    if (typeof errorMessage === "string") {
      assert.include(error.message, errorMessage);
    } else if (errorMessage !== undefined) {
      assert.match(error.message, errorMessage);
    }

    return;
  }

  throw new AssertionError(
    `HardhatError number ${errorDescriptor.number} expected, but no Error was thrown`
  );
}

export async function expectHardhatErrorAsync(
  f: () => Promise<any>,
  errorDescriptor: ErrorDescriptor,
  errorMessage?: string | RegExp
) {
  // We create the error here to capture the stack trace before the await.
  // This makes things easier, at least as long as we don't have async stack
  // traces. This may change in the near-ish future.
  const error = new AssertionError(
    `HardhatError number ${errorDescriptor.number} expected, but no Error was thrown`
  );

  const notExactMatch = new AssertionError(
    `HardhatError was correct, but should have include "${errorMessage}" but got "`
  );

  const notRegexpMatch = new AssertionError(
    `HardhatError was correct, but should have matched regex ${errorMessage} but got "`
  );

  try {
    await f();
  } catch (err: unknown) {
    if (!(err instanceof HardhatError)) {
      assert.fail();
    }
    assert.equal(err.number, errorDescriptor.number);
    assert.notInclude(
      err.message,
      "%s",
      "HardhatError has old-style format tag"
    );
    assert.notMatch(
      err.message,
      /%[a-zA-Z][a-zA-Z0-9]*%/,
      "HardhatError has a non-replaced variable tag"
    );

    if (errorMessage !== undefined) {
      if (typeof errorMessage === "string") {
        if (!err.message.includes(errorMessage)) {
          notExactMatch.message += `${err.message}`;
          throw notExactMatch;
        }
      } else {
        if (errorMessage.exec(err.message) === null) {
          notRegexpMatch.message += `${err.message}`;
          throw notRegexpMatch;
        }
      }
    }

    return;
  }

  throw error;
}
