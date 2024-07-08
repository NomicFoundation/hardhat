import type { ErrorDescriptor } from "@ignored/hardhat-vnext-errors";

import assert from "node:assert/strict";

import { HardhatError } from "@ignored/hardhat-vnext-errors";
import { ensureError } from "@ignored/hardhat-vnext-utils/error";

export function assertIsHardhatError<ErrorDescriptorT extends ErrorDescriptor>(
  error: unknown,
  descritor: ErrorDescriptorT,
  messageArguments: HardhatError<ErrorDescriptorT>["messageArguments"],
): asserts error is HardhatError<ErrorDescriptorT> {
  assert.ok(HardhatError.isHardhatError(error), "Error is not a HardhatError");

  // We first compare the number individually to throw a better error message
  // in case the descriptors are different.
  assert.equal(
    error.descriptor.number,
    descritor.number,
    `Expected error number ${descritor.number}, but got ${error.descriptor.number}`,
  );

  assert.deepEqual(error.descriptor, descritor);

  assert.deepEqual(error.messageArguments, messageArguments);
}

export function assertThrowsHardhatError<
  ErrorDescriptorT extends ErrorDescriptor,
>(
  f: () => any,
  descritor: ErrorDescriptorT,
  messageArguments: HardhatError<ErrorDescriptorT>["messageArguments"],
): void {
  try {
    f();
  } catch (error) {
    ensureError(error);
    assertIsHardhatError(error, descritor, messageArguments);

    return;
  }

  assert.fail("Function did not throw any error");
}

export async function assertRejectsWithHardhatError<
  ErrorDescriptorT extends ErrorDescriptor,
>(
  f: (() => Promise<any>) | Promise<any>,
  descritor: ErrorDescriptorT,
  messageArguments: HardhatError<ErrorDescriptorT>["messageArguments"],
): Promise<void> {
  try {
    if (f instanceof Promise) {
      await f;
    } else {
      await f();
    }
  } catch (error) {
    ensureError(error);
    assertIsHardhatError(error, descritor, messageArguments);

    return;
  }

  assert.fail("Function did not throw any error");
}
