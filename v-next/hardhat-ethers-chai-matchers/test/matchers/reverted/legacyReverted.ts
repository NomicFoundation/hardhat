import { describe, it } from "node:test";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import {
  assertRejectsWithHardhatError,
  assertThrowsHardhatError,
} from "@nomicfoundation/hardhat-test-utils";
import { expect } from "chai";

import { addChaiMatchers } from "../../../src/internal/add-chai-matchers.js";

addChaiMatchers();

describe("INTEGRATION: Reverted", { timeout: 60000 }, () => {
  describe("Throwing deprecation error", () => {
    it("Should throw the right error", async () => {
      await assertRejectsWithHardhatError(
        async () => {
          await expect(() => {}).to.reverted;
        },
        HardhatError.ERRORS.CHAI_MATCHERS.GENERAL.DEPRECATED_REVERTED_MATCHER,
        {},
      );
    });

    it("Should also throw in a sync context", async () => {
      assertThrowsHardhatError(
        () => {
          void expect(() => {}).to.reverted;
        },
        HardhatError.ERRORS.CHAI_MATCHERS.GENERAL.DEPRECATED_REVERTED_MATCHER,
        {},
      );
    });

    it("Should work with a promise that rejects", async () => {
      await assertRejectsWithHardhatError(
        async () => {
          await expect(async () => {
            throw new Error("foo");
          }).to.reverted;
        },
        HardhatError.ERRORS.CHAI_MATCHERS.GENERAL.DEPRECATED_REVERTED_MATCHER,
        {},
      );
    });
  });
});
