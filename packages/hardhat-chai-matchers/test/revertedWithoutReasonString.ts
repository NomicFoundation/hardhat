import { AssertionError, expect } from "chai";
import { useEnvironment, useEnvironmentWithNode } from "./helpers";

import "../src";

describe("INTEGRATION: Reverted without reason string", function () {
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
    const expectAssertionError = async (x: Promise<void>, message: string) => {
      return expect(x).to.be.eventually.rejectedWith(AssertionError, message);
    };

    describe("calling a contract method that succeeds", function () {
      it("a write method that succeeds", async function () {
        await expectAssertionError(
          expect(matchers.succeeds()).to.be.revertedWithoutReasonString(),
          "Expected transaction to be reverted without a reason string, but it didn't revert"
        );
        await expect(
          matchers.succeeds()
        ).to.not.be.revertedWithoutReasonString();
      });

      it("a view method that succeeds", async function () {
        await expectAssertionError(
          expect(matchers.succeedsView()).to.be.revertedWithoutReasonString(),
          "Expected transaction to be reverted without a reason string, but it didn't revert"
        );
        await expect(
          matchers.succeedsView()
        ).to.not.be.revertedWithoutReasonString();
      });

      it("a gas estimation that succeeds", async function () {
        await expectAssertionError(
          expect(
            matchers.estimateGas.succeeds()
          ).to.be.revertedWithoutReasonString(),
          "Expected transaction to be reverted without a reason string, but it didn't revert"
        );
        await expect(
          matchers.estimateGas.succeeds()
        ).to.not.be.revertedWithoutReasonString();
      });

      it("a static call of a write method that succeeds", async function () {
        await expectAssertionError(
          expect(
            matchers.callStatic.succeeds()
          ).to.be.revertedWithoutReasonString(),
          "Expected transaction to be reverted without a reason string, but it didn't revert"
        );
        await expect(
          matchers.callStatic.succeeds()
        ).to.not.be.revertedWithoutReasonString();
      });
    });

    describe("calling a contract method that reverts", function () {
      it("a write method that reverts", async function () {
        await expect(
          matchers.revertsWithoutReasonString()
        ).to.be.revertedWithoutReasonString();
        await expect(
          matchers.revertsWith("some reason")
        ).to.not.be.revertedWithoutReasonString();

        await expectAssertionError(
          expect(
            matchers.revertsWith("some reason")
          ).to.be.revertedWithoutReasonString(),
          "Expected transaction to be reverted without a reason string, but it reverted with reason 'some reason'"
        );
        await expectAssertionError(
          expect(
            matchers.revertsWithoutReasonString()
          ).to.not.be.revertedWithoutReasonString(),
          "Expected transaction NOT to be reverted without a reason string, but it did"
        );
      });

      it("a view method that reverts", async function () {
        await expect(
          matchers.revertsWithoutReasonStringView()
        ).to.be.revertedWithoutReasonString();
        await expect(
          matchers.revertsWithView("some reason")
        ).to.not.be.revertedWithoutReasonString();

        await expectAssertionError(
          expect(
            matchers.revertsWithView("some reason")
          ).to.be.revertedWithoutReasonString(),
          "Expected transaction to be reverted without a reason string, but it reverted with reason 'some reason'"
        );
        await expectAssertionError(
          expect(
            matchers.revertsWithoutReasonStringView()
          ).to.not.be.revertedWithoutReasonString(),
          "Expected transaction NOT to be reverted without a reason string, but it did"
        );
      });

      it("a gas estimation that reverts", async function () {
        await expect(
          matchers.estimateGas.revertsWithoutReasonString()
        ).to.be.revertedWithoutReasonString();
        await expect(
          matchers.estimateGas.revertsWith("some reason")
        ).to.not.be.revertedWithoutReasonString();

        await expectAssertionError(
          expect(
            matchers.estimateGas.revertsWith("some reason")
          ).to.be.revertedWithoutReasonString(),
          "Expected transaction to be reverted without a reason string, but it reverted with reason 'some reason'"
        );
        await expectAssertionError(
          expect(
            matchers.estimateGas.revertsWithoutReasonString()
          ).to.not.be.revertedWithoutReasonString(),
          "Expected transaction NOT to be reverted without a reason string, but it did"
        );
      });

      it("a static call of a write method that reverts", async function () {
        await expect(
          matchers.callStatic.revertsWithoutReasonString()
        ).to.be.revertedWithoutReasonString();
        await expect(
          matchers.callStatic.revertsWith("some reason")
        ).to.not.be.revertedWithoutReasonString();

        await expectAssertionError(
          expect(
            matchers.callStatic.revertsWith("some reason")
          ).to.be.revertedWithoutReasonString(),
          "Expected transaction to be reverted without a reason string, but it reverted with reason 'some reason'"
        );
        await expectAssertionError(
          expect(
            matchers.callStatic.revertsWithoutReasonString()
          ).to.not.be.revertedWithoutReasonString(),
          "Expected transaction NOT to be reverted without a reason string, but it did"
        );
      });
    });

    describe("invalid values", function () {
      it("non-errors as subject", async function () {
        await expectAssertionError(
          expect(Promise.reject({})).to.be.revertedWithoutReasonString(),
          "Expected an Error object"
        );
      });
    });
  }
});
