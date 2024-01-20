import type EthersT from "ethers";
import ordinal from "ordinal";
import { AssertWithSsfi, Ssfi } from "../utils";
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

export function assertArgsArraysEqual(
  Assertion: Chai.AssertionStatic,
  expectedArgs: any[],
  actualArgs: any[],
  tag: string,
  name: string,
  assert: AssertWithSsfi,
  ssfi: Ssfi
) {
  const ethers = require("ethers") as typeof EthersT;
  assert(
    actualArgs.length === expectedArgs.length,
    `Expected "${name}" ${tag} to have ${expectedArgs.length} argument(s), but it has ${actualArgs.length}`
  );
  for (const [index, expectedArg] of expectedArgs.entries()) {
    const actualArg = actualArgs[index];
    if (typeof expectedArg === "function") {
      const errorPrefix = `The predicate for the ${ordinal(
        index + 1
      )} ${tag} argument`;
      try {
        if (expectedArg(actualArg) === true) continue;
      } catch (e: any) {
        assert(
          false,
          `${errorPrefix} threw when called: ${e.message}`
          // no need for a negated message, since we disallow mixing .not. with
          // .withArgs
        );
      }
      assert(
        false,
        `${errorPrefix} did not return true `
        // no need for a negated message, since we disallow mixing .not. with
        // .withArgs
      );
    } else if (expectedArg instanceof Uint8Array) {
      new Assertion(actualArg, undefined, ssfi, true).equal(
        ethers.hexlify(expectedArg)
      );
    } else if (
      expectedArg?.length !== undefined &&
      typeof expectedArg !== "string"
    ) {
      const expectedLength = expectedArg.length;
      const actualLength = actualArg.length;
      assert(
        expectedLength === actualLength,
        `Expected the ${ordinal(
          index + 1
        )} argument of the "${name}" ${tag} to have ${expectedLength} ${
          expectedLength === 1 ? "element" : "elements"
        }, but it has ${actualLength}`
      );

      for (let j = 0; j < expectedArg.length; j++) {
        new Assertion(actualArg[j], undefined, ssfi, true).equal(
          expectedArg[j]
        );
      }
    } else {
      if (actualArg.hash !== undefined && actualArg._isIndexed === true) {
        new Assertion(actualArg.hash, undefined, ssfi, true).to.not.equal(
          expectedArg,
          "The actual value was an indexed and hashed value of the event argument. The expected value provided to the assertion should be the actual event argument (the pre-image of the hash). You provided the hash itself. Please supply the actual event argument (the pre-image of the hash) instead."
        );
        const expectedArgBytes = ethers.isHexString(expectedArg)
          ? ethers.getBytes(expectedArg)
          : ethers.toUtf8Bytes(expectedArg);
        const expectedHash = ethers.keccak256(expectedArgBytes);
        new Assertion(actualArg.hash, undefined, ssfi, true).to.equal(
          expectedHash,
          `The actual value was an indexed and hashed value of the event argument. The expected value provided to the assertion was hashed to produce ${expectedHash}. The actual hash and the expected hash did not match`
        );
      } else {
        new Assertion(actualArg, undefined, ssfi, true).equal(expectedArg);
      }
    }
  }
}
