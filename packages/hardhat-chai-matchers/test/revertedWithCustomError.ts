import { AssertionError, expect } from "chai";
import { useEnvironment, useEnvironmentWithNode } from "./helpers";

import "../src";

describe("INTEGRATION: Reverted with custom error", function () {
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

    const mineSuccessfulTransaction = async (hre: any) => {
      await hre.network.provider.send("evm_setAutomine", [false]);

      const [signer] = await hre.ethers.getSigners();
      const tx = await signer.sendTransaction({ to: signer.address });

      await hre.network.provider.send("hardhat_mine", []);
      await hre.network.provider.send("evm_setAutomine", [true]);

      return tx;
    };

    describe("calling a method that succeeds", function () {
      assertAllTransactionsKinds({
        method: "succeeds",
        args: [],
        successfulAssert: (x) =>
          expect(x).to.not.be.revertedWithCustomError(
            matchers,
            "SomeCustomError"
          ),
        failedAssert: (x) =>
          expect(x).to.be.revertedWithCustomError(matchers, "SomeCustomError"),
        failedAssertReason:
          "Expected transaction to be reverted with custom error 'SomeCustomError', but it didn't revert",
      });
    });

    describe("calling a method that reverts without a reason string", function () {
      assertAllTransactionsKinds({
        method: "revertsWithoutReasonString",
        args: [],
        successfulAssert: (x) =>
          expect(x).to.not.be.revertedWithCustomError(
            matchers,
            "SomeCustomError"
          ),
        failedAssert: (x) =>
          expect(x).to.be.revertedWithCustomError(matchers, "SomeCustomError"),
        failedAssertReason:
          "Expected transaction to be reverted with custom error 'SomeCustomError', but it reverted without a reason string",
      });
    });

    describe("calling a method that reverts with a reason string", function () {
      assertAllTransactionsKinds({
        method: "revertsWith",
        args: ["some reason"],
        successfulAssert: (x) =>
          expect(x).to.not.be.revertedWithCustomError(
            matchers,
            "SomeCustomError"
          ),
        failedAssert: (x) =>
          expect(x).to.be.revertedWithCustomError(matchers, "SomeCustomError"),
        failedAssertReason:
          "Expected transaction to be reverted with custom error 'SomeCustomError', but it reverted with reason 'some reason'",
      });
    });

    describe("calling a method that reverts with a panic code", function () {
      assertAllTransactionsKinds({
        method: "panicAssert",
        args: [],
        successfulAssert: (x) =>
          expect(x).to.not.be.revertedWithCustomError(
            matchers,
            "SomeCustomError"
          ),
        failedAssert: (x) =>
          expect(x).to.be.revertedWithCustomError(matchers, "SomeCustomError"),
        failedAssertReason:
          "Expected transaction to be reverted with custom error 'SomeCustomError', but it reverted with panic code 0x01 (Assertion error)",
      });
    });

    describe("calling a method that reverts with a custom error", function () {
      describe("reverts with the same custom error", function () {
        assertAllTransactionsKinds({
          method: "revertWithSomeCustomError",
          args: [],
          successfulAssert: (x) =>
            expect(x).to.be.revertedWithCustomError(
              matchers,
              "SomeCustomError"
            ),
          failedAssert: (x) =>
            expect(x).not.to.be.revertedWithCustomError(
              matchers,
              "SomeCustomError"
            ),
          failedAssertReason:
            "Expected transaction NOT to be reverted with custom error 'SomeCustomError', but it did",
        });
      });

      describe("reverts with another custom error of the same contract", function () {
        assertAllTransactionsKinds({
          method: "revertWithSomeCustomError",
          args: [],
          successfulAssert: (x) =>
            expect(x).to.not.be.revertedWithCustomError(
              matchers,
              "AnotherCustomError"
            ),
          failedAssert: (x) =>
            expect(x).to.be.revertedWithCustomError(
              matchers,
              "AnotherCustomError"
            ),
          failedAssertReason:
            "Expected transaction to be reverted with custom error 'AnotherCustomError', but it reverted with custom error 'SomeCustomError'",
        });
      });

      describe("reverts with another custom error of another contract", function () {
        assertAllTransactionsKinds({
          method: "revertWithAnotherContractCustomError",
          args: [],
          successfulAssert: (x) =>
            expect(x).to.not.be.revertedWithCustomError(
              matchers,
              "SomeCustomError"
            ),
          failedAssert: (x) =>
            expect(x).to.be.revertedWithCustomError(
              matchers,
              "SomeCustomError"
            ),
          failedAssertReason:
            "Expected transaction to be reverted with custom error 'SomeCustomError', but it reverted with a different custom error",
        });
      });
    });

    describe("invalid values", function () {
      it("non-errors as subject", async function () {
        await expectAssertionError(
          expect(Promise.reject({})).to.be.revertedWith("some reason"),
          "Expected an Error object"
        );
      });

      it("non-string as expectation", async function () {
        const { hash } = await mineSuccessfulTransaction(this.hre);

        await expectAssertionError(
          expect(hash).to.be.revertedWith(10 as any),
          "Expected a string as the expected reason string"
        );
      });

      it("the contract is not specified", async function () {
        expect(() =>
          expect(matchers.revertWithSomeCustomError())
            .to.be // @ts-expect-error
            .revertedWithCustomError("SomeCustomError")
        ).to.throw(
          Error,
          "The first argument of .revertedWithCustomError has to be the contract that defines the custom error"
        );
      });
    });

    function assertAllTransactionsKinds({
      method,
      args,
      successfulAssert,
      failedAssert,
      failedAssertReason,
    }: {
      method: string;
      args: any[];
      successfulAssert: (x: any) => Promise<void>;
      failedAssert: (x: any) => Promise<void>;
      failedAssertReason: string;
    }) {
      it("when a transaction is sent", async function () {
        await successfulAssert(matchers[method](...args));

        await expectAssertionError(
          failedAssert(matchers[method](...args)),
          failedAssertReason
        );
      });

      it("when the method is a view method", async function () {
        await successfulAssert(matchers[`${method}View`](...args));

        await expectAssertionError(
          failedAssert(matchers[`${method}View`](...args)),
          failedAssertReason
        );
      });

      it("when a gas estimation is done", async function () {
        await successfulAssert(matchers.estimateGas[method](...args));

        await expectAssertionError(
          failedAssert(matchers.estimateGas[method](...args)),
          failedAssertReason
        );
      });

      it("when the method is called statically", async function () {
        await successfulAssert(matchers.callStatic[method](...args));

        await expectAssertionError(
          failedAssert(matchers.callStatic[method](...args)),
          failedAssertReason
        );
      });
    }
  }
});
