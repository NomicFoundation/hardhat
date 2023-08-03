import { ASYNC_MATCHER_CALLED } from "./constants";
import {
  HardhatChaiMatchersAssertionError,
  HardhatChaiMatchersNonChainableMatcherError,
} from "./errors";

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

export function preventAsyncMatcherChaining(
  context: object,
  matcherName: string,
  chaiUtils: Chai.ChaiUtils
) {
  if (chaiUtils.flag(context, ASYNC_MATCHER_CALLED) === true) {
    throw new HardhatChaiMatchersNonChainableMatcherError(matcherName);
  }
  chaiUtils.flag(context, ASYNC_MATCHER_CALLED, true);
}
