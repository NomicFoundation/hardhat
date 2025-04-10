import { HardhatError } from "@nomicfoundation/hardhat-errors";

import { PREVIOUS_MATCHER_NAME } from "../constants.js";

export function preventAsyncMatcherChaining(
  context: object,
  matcherName: string,
  chaiUtils: Chai.ChaiUtils,
  allowSelfChaining: boolean = false,
): void {
  const previousMatcherName: string | undefined = chaiUtils.flag(
    context,
    PREVIOUS_MATCHER_NAME,
  );

  if (previousMatcherName === undefined) {
    chaiUtils.flag(context, PREVIOUS_MATCHER_NAME, matcherName);

    return;
  }

  if (previousMatcherName === matcherName && allowSelfChaining) {
    return;
  }

  throw new HardhatError(
    HardhatError.ERRORS.CHAI_MATCHERS.GENERAL.MATCHER_CANNOT_BE_CHAINED_AFTER,
    {
      matcher: matcherName,
      previousMatcher: previousMatcherName,
    },
  );
}
