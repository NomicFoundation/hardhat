import { AssertionError, expect } from "chai";
import {
  runSuccessfulAsserts,
  runFailedAsserts,
  useEnvironment,
  useEnvironmentWithNode,
} from "./helpers";

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

    describe("calling a method that succeeds", function () {
      it("successful asserts", async function () {
        await runSuccessfulAsserts({
          matchers,
          method: "succeeds",
          successfulAssert: (x) =>
            expect(x).not.to.be.revertedWithoutReasonString(),
        });
      });

      it("failed asserts", async function () {
        await runFailedAsserts({
          matchers,
          method: "succeeds",
          failedAssert: (x) => expect(x).to.be.revertedWithoutReasonString(),
          failedAssertReason:
            "Expected transaction to be reverted without a reason string, but it didn't revert",
        });
      });
    });

    describe("calling a method that reverts without a reason string", function () {
      it("successful asserts", async function () {
        await runSuccessfulAsserts({
          matchers,
          method: "revertsWithoutReasonString",
          args: [],
          successfulAssert: (x) =>
            expect(x).to.be.revertedWithoutReasonString(),
        });
      });

      it("failed asserts", async function () {
        await runFailedAsserts({
          matchers,
          method: "revertsWithoutReasonString",
          args: [],
          failedAssert: (x) =>
            expect(x).to.not.be.revertedWithoutReasonString(),
          failedAssertReason:
            "Expected transaction NOT to be reverted without a reason string, but it did",
        });
      });
    });

    describe("calling a method that reverts with a reason string", function () {
      it("successful asserts", async function () {
        await runSuccessfulAsserts({
          matchers,
          method: "revertsWith",
          args: ["some reason"],
          successfulAssert: (x) =>
            expect(x).to.not.be.revertedWithoutReasonString(),
        });
      });

      it("failed asserts", async function () {
        await runFailedAsserts({
          matchers,
          method: "revertsWith",
          args: ["some reason"],
          failedAssert: (x) => expect(x).to.be.revertedWithoutReasonString(),
          failedAssertReason:
            "Expected transaction to be reverted without a reason string, but it reverted with reason 'some reason'",
        });
      });
    });

    describe("calling a method that reverts with a panic code", function () {
      it("successful asserts", async function () {
        await runSuccessfulAsserts({
          matchers,
          method: "panicAssert",
          successfulAssert: (x) =>
            expect(x).to.not.be.revertedWithoutReasonString(),
        });
      });

      it("failed asserts", async function () {
        await runFailedAsserts({
          matchers,
          method: "panicAssert",
          failedAssert: (x) => expect(x).to.be.revertedWithoutReasonString(),
          failedAssertReason:
            "Expected transaction to be reverted without a reason string, but it reverted with panic code 0x01 (Assertion error)",
        });
      });
    });

    describe("calling a method that reverts with a custom error", function () {
      it("successful asserts", async function () {
        await runSuccessfulAsserts({
          matchers,
          method: "revertWithSomeCustomError",
          successfulAssert: (x) =>
            expect(x).to.not.be.revertedWith("some reason"),
        });
      });

      it("failed asserts", async function () {
        await runFailedAsserts({
          matchers,
          method: "revertWithSomeCustomError",
          failedAssert: (x) => expect(x).to.be.revertedWith("some reason"),
          failedAssertReason:
            "Expected transaction to be reverted with reason 'some reason', but it reverted with a custom error",
        });
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
