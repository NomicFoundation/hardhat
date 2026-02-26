import { assert as chaiAssert } from "chai";

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

  chaiAssert.fail(
    `The matcher "${matcherName}" cannot be chained after "${previousMatcherName}". For more information, please refer to the documentation at: (https://hardhat.org/chaining-async-matchers).`,
  );
}
