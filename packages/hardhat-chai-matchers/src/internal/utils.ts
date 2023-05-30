import { HardhatChaiMatchersAssertionError } from "./errors";

export function assertIsNotNull<T>(
  value: T,
  valueName: string
): asserts value is Exclude<T, null> {
  if (value === null) {
    throw new HardhatChaiMatchersAssertionError(
      `${valueName} should not be null`
    );
  }
}
