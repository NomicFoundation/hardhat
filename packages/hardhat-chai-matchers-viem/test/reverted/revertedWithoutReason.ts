import { AssertionError, expect } from "chai";
import { TransactionExecutionError } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import path from "path";
import util from "util";

import {
  runSuccessfulAsserts,
  runFailedAsserts,
  useEnvironment,
  useEnvironmentWithNode,
} from "../helpers";

import "../../src/internal/add-chai-matchers";
import { MatchersContract } from "../contracts";

describe("INTEGRATION: Reverted without reason", function () {
  describe("with the in-process hardhat network", function () {
    useEnvironment("hardhat-project");

    runTests();
  });

  // external hardhat node with viem does not include error data in some cases
  describe.skip("connected to a hardhat node", function () {
    useEnvironmentWithNode("hardhat-project");

    runTests();
  });

  function runTests() {
    // deploy Matchers contract before each test
    let matchers: MatchersContract;
    beforeEach("deploy matchers contract", async function () {
      // Contract artifacts don't exist until tests are run.
      // Without artifacts, ts doesn't know contract types.
      // So build fails which prevents tests from being run.
      // '[contract] as unknown as [Contract]' is a bandaid.
      matchers = (await this.hre.viem.deployContract(
        "Matchers"
      )) as unknown as MatchersContract;
    });

    // helpers
    describe("calling a method that succeeds", function () {
      it("successful asserts", async function () {
        await runSuccessfulAsserts({
          matchers,
          method: "succeeds",
          successfulAssert: (x) => expect(x).not.to.be.revertedWithoutReason(),
        });
      });

      it("failed asserts", async function () {
        await runFailedAsserts({
          matchers,
          method: "succeeds",
          failedAssert: (x) => expect(x).to.be.revertedWithoutReason(),
          failedAssertReason:
            "Expected transaction to be reverted without a reason, but it didn't revert",
        });
      });
    });

    describe("calling a method that reverts without a reason", function () {
      it("successful asserts", async function () {
        await runSuccessfulAsserts({
          matchers,
          method: "revertsWithoutReason",
          args: [],
          successfulAssert: (x) => expect(x).to.be.revertedWithoutReason(),
        });
      });

      it("failed asserts", async function () {
        await runFailedAsserts({
          matchers,
          method: "revertsWithoutReason",
          args: [],
          failedAssert: (x) => expect(x).to.not.be.revertedWithoutReason(),
          failedAssertReason:
            "Expected transaction NOT to be reverted without a reason, but it was",
        });
      });
    });

    describe("calling a method that reverts with a reason", function () {
      it("successful asserts", async function () {
        await runSuccessfulAsserts({
          matchers,
          method: "revertsWith",
          args: ["some reason"],
          successfulAssert: (x) => expect(x).to.not.be.revertedWithoutReason(),
        });
      });

      it("failed asserts", async function () {
        await runFailedAsserts({
          matchers,
          method: "revertsWith",
          args: ["some reason"],
          failedAssert: (x) => expect(x).to.be.revertedWithoutReason(),
          failedAssertReason:
            "Expected transaction to be reverted without a reason, but it reverted with reason 'some reason'",
        });
      });
    });

    describe("calling a method that reverts with a panic code", function () {
      it("successful asserts", async function () {
        await runSuccessfulAsserts({
          matchers,
          method: "panicAssert",
          successfulAssert: (x) => expect(x).to.not.be.revertedWithoutReason(),
        });
      });

      it("failed asserts", async function () {
        await runFailedAsserts({
          matchers,
          method: "panicAssert",
          failedAssert: (x) => expect(x).to.be.revertedWithoutReason(),
          failedAssertReason:
            "Expected transaction to be reverted without a reason, but it reverted with panic code 0x01 (Assertion error)",
        });
      });
    });

    describe("calling a method that reverts with a custom error", function () {
      it("successful asserts", async function () {
        await runSuccessfulAsserts({
          matchers,
          method: "revertWithSomeCustomError",
          successfulAssert: (x) => expect(x).to.not.be.revertedWithoutReason(),
        });
      });

      it("failed asserts", async function () {
        await runFailedAsserts({
          matchers,
          method: "revertWithSomeCustomError",
          failedAssert: (x) => expect(x).to.be.revertedWithoutReason(),
          failedAssertReason:
            "Expected transaction to be reverted without a reason, but it reverted with a custom error",
        });
      });
    });

    describe("invalid values", function () {
      it("non-errors as subject", async function () {
        await expect(
          expect(Promise.reject({})).to.be.revertedWithoutReason()
        ).to.be.rejectedWith(AssertionError, "Expected an Error object");
      });

      it("errors that are not related to a reverted transaction", async function () {
        // use an address that almost surely doesn't have balance
        const randomPrivateKey =
          "0xc5c587cc6e48e9692aee0bf07474118e6d830c11905f7ec7ff32c09c99eba5f9";
        const account = privateKeyToAccount(randomPrivateKey);

        // this transaction will fail because of lack of funds, not because of a
        // revert
        await expect(
          expect(
            matchers.write.revertsWithoutReason({
              gas: 1_000_000n,
              account,
            })
          ).to.not.be.revertedWithoutReason()
        ).to.be.eventually.rejectedWith(
          TransactionExecutionError,
          "Sender doesn't have enough funds to send tx"
        );
      });
    });

    describe("stack traces", function () {
      // smoke test for stack traces
      it("includes test file", async function () {
        try {
          await expect(
            matchers.write.revertsWithoutReason()
          ).to.not.be.revertedWithoutReason();
        } catch (e: any) {
          const errorString = util.inspect(e);
          expect(errorString).to.include(
            "Expected transaction NOT to be reverted without a reason, but it was"
          );
          expect(errorString).to.include(
            path.join("test", "reverted", "revertedWithoutReason.ts")
          );

          return;
        }

        expect.fail("Expected an exception but none was thrown");
      });
    });
  }
});
