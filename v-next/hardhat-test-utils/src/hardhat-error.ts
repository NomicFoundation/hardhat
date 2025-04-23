import type { ErrorDescriptor } from "@nomicfoundation/hardhat-errors";

import assert from "node:assert/strict";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import { ensureError } from "@nomicfoundation/hardhat-utils/error";

/**
 * Asserts that an error is a HardhatError with a certain descriptor and message
 * arguments.
 *
 * @param error The error.
 * @param descriptor The error descriptor.
 * @param messageArguments The message arguments.
 */
export function assertIsHardhatError<ErrorDescriptorT extends ErrorDescriptor>(
  error: unknown,
  descriptor: ErrorDescriptorT,
  messageArguments: HardhatError<ErrorDescriptorT>["messageArguments"],
): asserts error is HardhatError<ErrorDescriptorT> {
  assert.ok(HardhatError.isHardhatError(error), "Error is not a HardhatError");

  // We first compare the number individually to throw a better error message
  // in case the descriptors are different.
  assert.equal(
    error.descriptor.number,
    descriptor.number,
    `Expected error number ${descriptor.number}, but got ${error.descriptor.number}`,
  );

  assert.deepEqual(error.descriptor, descriptor);

  assert.deepEqual(error.messageArguments, messageArguments);
}

/**
 * Asserts that calling a function throws a HardhatError with a certain
 * descriptor and message arguments.
 *
 * @param f The function that should throw.
 * @param descriptor The error descriptor.
 * @param messageArguments The message arguments.
 */
export function assertThrowsHardhatError<
  ErrorDescriptorT extends ErrorDescriptor,
>(
  f: () => any,
  descriptor: ErrorDescriptorT,
  messageArguments: HardhatError<ErrorDescriptorT>["messageArguments"],
): void {
  try {
    f();
  } catch (error) {
    ensureError(error);
    assertIsHardhatError(error, descriptor, messageArguments);

    return;
  }

  assert.fail("Function did not throw any error");
}

/**
 * Asserts that an async operation (i.e. calling an async function or a promise)
 * gets rejected with a HardhatError with a certain descriptor and message
 * arguments.
 *
 * @param op The async operation. If it's a function, it's called and awaited.
 * @param descriptor The error descriptor.
 * @param messageArguments The message arguments.
 */
export async function assertRejectsWithHardhatError<
  ErrorDescriptorT extends ErrorDescriptor,
>(
  op: (() => Promise<any>) | Promise<any>,
  descriptor: ErrorDescriptorT,
  messageArguments: HardhatError<ErrorDescriptorT>["messageArguments"],
): Promise<void> {
  try {
    if (op instanceof Promise) {
      await op;
    } else {
      await op();
    }
  } catch (error) {
    ensureError(error);
    assertIsHardhatError(error, descriptor, messageArguments);

    return;
  }

  assert.fail("Function did not throw any error");
}
