import { describe, it } from "node:test";

import {
  assertRejects,
  assertThrows,
} from "@nomicfoundation/hardhat-test-utils";
import { expect } from "chai";

import { addChaiMatchers } from "../../../src/internal/add-chai-matchers.js";

addChaiMatchers();

describe("INTEGRATION: Reverted", { timeout: 60000 }, () => {
  describe("Throwing deprecation error", () => {
    it("Should throw the right error", async () => {
      await assertRejects(
        async () => {
          await expect(() => {}).to.reverted;
        },
        (e) =>
          e.message.includes(
            "The .reverted matcher has been deprecated. Use .revert(ethers) instead.",
          ),
        "Expected deprecated reverted matcher error message",
      );
    });

    it("Should also throw in a sync context", async () => {
      assertThrows(
        () => {
          void expect(() => {}).to.reverted;
        },
        (e) =>
          e.message.includes(
            "The .reverted matcher has been deprecated. Use .revert(ethers) instead.",
          ),
        "Expected deprecated reverted matcher error message",
      );
    });

    it("Should work with a promise that rejects", async () => {
      await assertRejects(
        async () => {
          await expect(async () => {
            throw new Error("foo");
          }).to.reverted;
        },
        (e) =>
          e.message.includes(
            "The .reverted matcher has been deprecated. Use .revert(ethers) instead.",
          ),
        "Expected deprecated reverted matcher error message",
      );
    });
  });
});
