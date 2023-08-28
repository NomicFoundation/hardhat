import { PREVIOUS_MATCHER_NAME } from "./constants";
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
  chaiUtils: Chai.ChaiUtils,
  allowSelfChaining: boolean = false
) {
  const previousMatcherName: string | undefined = chaiUtils.flag(
    context,
    PREVIOUS_MATCHER_NAME
  );

  if (previousMatcherName === undefined) {
    chaiUtils.flag(context, PREVIOUS_MATCHER_NAME, matcherName);
    return;
  }

  if (previousMatcherName === matcherName && allowSelfChaining) {
    return;
  }

  throw new HardhatChaiMatchersNonChainableMatcherError(
    matcherName,
    previousMatcherName
  );
}
