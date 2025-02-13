import assert from "node:assert/strict";

import { ensureError } from "@ignored/hardhat-vnext-utils/error";

/**
 * Asserts that an async operation (i.e. calling an async function or a promise)
 * gets rejected with an Error, optionally checking that the error satisfies a
 * condition.
 *
 * @param op The async operation. If it's a function, it's called and awaited.
 * @param condition The condition to check the error against.
 * @param conditionDescription The message to use in the error message if the
 * condition is not met.
 */
export async function assertRejects(
  op: (() => Promise<any>) | Promise<any>,
  condition?: (error: Error) => boolean,
  conditionDescription: string = "Condition for error not met",
): Promise<void> {
  try {
    if (op instanceof Promise) {
      await op;
    } else {
      await op();
    }
  } catch (error) {
    ensureError(error);

    if (condition === undefined) {
      return;
    }

    assert.ok(condition(error), conditionDescription);
    return;
  }

  throw new Error("Function did not throw any error");
}

/**
 * Asserts that a function throws an error.
 *
 * @param f The function to call.
 * @param condition An optional condition that the error must satisfy.
 * @param conditionDescription An optional description of the condition.
 */
export function assertThrows(
  f: () => any,
  condition?: (error: Error) => boolean,
  conditionDescription: string = "Condition for error not met",
): void {
  try {
    f();
  } catch (error) {
    ensureError(error);

    if (condition === undefined) {
      return;
    }

    if (!condition(error)) {
      throw new Error(conditionDescription, { cause: error });
    }

    return;
  }

  throw new Error("Function did not throw any error");
}
