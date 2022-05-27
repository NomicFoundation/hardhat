import { AssertionError, expect } from "chai";
import { ProviderError } from "hardhat/internal/core/providers/errors";

import {
  runSuccessfulAsserts,
  runFailedAsserts,
  useEnvironment,
  useEnvironmentWithNode,
} from "../helpers";

import "../../src";

describe("INTEGRATION: Reverted without reason", function () {
  describe("with the in-process hardhat network", function () {
    useEnvironment("hardhat-project");

    runTests();
  });

  describe("connected to a hardhat node", function () {
    useEnvironmentWithNode("hardhat-project");

    runTests();
  });

  function runTests() {
    // deploy Matchers contract before each test
    let matchers: any;
    beforeEach("deploy matchers contract", async function () {
      const Matchers = await this.hre.ethers.getContractFactory("Matchers");
      matchers = await Matchers.deploy();
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
        const signer = new this.hre.ethers.Wallet(
          randomPrivateKey,
          this.hre.ethers.provider
        );

        // this transaction will fail because of lack of funds, not because of a
        // revert
        await expect(
          expect(
            matchers.connect(signer).revertsWithoutReason({
              gasLimit: 1_000_000,
            })
          ).to.not.be.revertedWithoutReason()
        ).to.be.eventually.rejectedWith(
          ProviderError,
          "sender doesn't have enough funds to send tx"
        );
      });
    });
  }
});
