import { AssertionError, expect } from "chai";
import {
  runSuccessfulAsserts,
  runFailedAsserts,
  useEnvironment,
  useEnvironmentWithNode,
} from "../helpers";

import "../../src";

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
      it("successful asserts", async function () {
        await runSuccessfulAsserts({
          matchers,
          method: "succeeds",
          successfulAssert: (x) =>
            expect(x).not.to.be.revertedWithCustomError(
              matchers,
              "SomeCustomError"
            ),
        });
      });

      it("failed asserts", async function () {
        await runFailedAsserts({
          matchers,
          method: "succeeds",
          failedAssert: (x) =>
            expect(x).to.be.revertedWithCustomError(
              matchers,
              "SomeCustomError"
            ),
          failedAssertReason:
            "Expected transaction to be reverted with custom error 'SomeCustomError', but it didn't revert",
        });
      });
    });

    describe("calling a method that reverts without a reason string", function () {
      it("successful asserts", async function () {
        await runSuccessfulAsserts({
          matchers,
          method: "revertsWithoutReasonString",
          successfulAssert: (x) =>
            expect(x).to.not.be.revertedWithCustomError(
              matchers,
              "SomeCustomError"
            ),
        });
      });

      it("failed asserts", async function () {
        await runFailedAsserts({
          matchers,
          method: "revertsWithoutReasonString",
          failedAssert: (x) =>
            expect(x).to.be.revertedWithCustomError(
              matchers,
              "SomeCustomError"
            ),
          failedAssertReason:
            "Expected transaction to be reverted with custom error 'SomeCustomError', but it reverted without a reason string",
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
            expect(x).to.not.be.revertedWithCustomError(
              matchers,
              "SomeCustomError"
            ),
        });
      });

      it("failed asserts", async function () {
        await runFailedAsserts({
          matchers,
          method: "revertsWith",
          args: ["some reason"],
          failedAssert: (x) =>
            expect(x).to.be.revertedWithCustomError(
              matchers,
              "SomeCustomError"
            ),
          failedAssertReason:
            "Expected transaction to be reverted with custom error 'SomeCustomError', but it reverted with reason 'some reason'",
        });
      });
    });

    describe("calling a method that reverts with a panic code", function () {
      it("successful asserts", async function () {
        await runSuccessfulAsserts({
          matchers,
          method: "panicAssert",
          successfulAssert: (x) =>
            expect(x).to.not.be.revertedWithCustomError(
              matchers,
              "SomeCustomError"
            ),
        });
      });

      it("failed asserts", async function () {
        await runFailedAsserts({
          matchers,
          method: "panicAssert",
          failedAssert: (x) =>
            expect(x).to.be.revertedWithCustomError(
              matchers,
              "SomeCustomError"
            ),
          failedAssertReason:
            "Expected transaction to be reverted with custom error 'SomeCustomError', but it reverted with panic code 0x01 (Assertion error)",
        });
      });
    });

    describe("calling a method that reverts with a custom error", function () {
      it("successful asserts", async function () {
        await runSuccessfulAsserts({
          matchers,
          method: "revertWithSomeCustomError",
          successfulAssert: (x) =>
            expect(x).to.be.revertedWithCustomError(
              matchers,
              "SomeCustomError"
            ),
        });

        await runSuccessfulAsserts({
          matchers,
          method: "revertWithAnotherCustomError",
          successfulAssert: (x) =>
            expect(x).to.not.be.revertedWithCustomError(
              matchers,
              "SomeCustomError"
            ),
        });
      });

      it("failed asserts: expected custom error not to match", async function () {
        await runFailedAsserts({
          matchers,
          method: "revertWithSomeCustomError",
          failedAssert: (x) =>
            expect(x).to.not.be.revertedWithCustomError(
              matchers,
              "SomeCustomError"
            ),
          failedAssertReason:
            "Expected transaction NOT to be reverted with custom error 'SomeCustomError', but it did",
        });
      });

      it("failed asserts: reverts with another custom error of the same contract", async function () {
        await runFailedAsserts({
          matchers,
          method: "revertWithAnotherCustomError",
          failedAssert: (x) =>
            expect(x).to.be.revertedWithCustomError(
              matchers,
              "SomeCustomError"
            ),
          failedAssertReason:
            "Expected transaction to be reverted with custom error 'SomeCustomError', but it reverted with custom error 'AnotherCustomError'",
        });
      });

      it("failed asserts: reverts with another custom error of another contract", async function () {
        await runFailedAsserts({
          matchers,
          method: "revertWithAnotherContractCustomError",
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

    describe("with args", function () {
      it("should work with one argument", async function () {
        await expect(matchers.revertWithCustomErrorWithUint(1))
          .to.be.revertedWithCustomError(matchers, "CustomErrorWithUint")
          .withArgs(1);

        await expectAssertionError(
          expect(matchers.revertWithCustomErrorWithUint(1))
            .to.be.revertedWithCustomError(matchers, "CustomErrorWithUint")
            .withArgs(2),
          "expected 1 to equal 2"
        );
      });

      it("should work with two arguments", async function () {
        await expect(matchers.revertWithCustomErrorWithUintAndString(1, "foo"))
          .to.be.revertedWithCustomError(
            matchers,
            "CustomErrorWithUintAndString"
          )
          .withArgs(1, "foo");

        await expectAssertionError(
          expect(matchers.revertWithCustomErrorWithUintAndString(1, "foo"))
            .to.be.revertedWithCustomError(
              matchers,
              "CustomErrorWithUintAndString"
            )
            .withArgs(2, "foo"),
          "expected 1 to equal 2"
        );

        await expectAssertionError(
          expect(matchers.revertWithCustomErrorWithUintAndString(1, "foo"))
            .to.be.revertedWithCustomError(
              matchers,
              "CustomErrorWithUintAndString"
            )
            .withArgs(1, "bar"),
          "expected 'foo' to equal 'bar'"
        );
      });

      // skipped until .deep.equal works with big numbers
      it.skip("should work with nested arguments", async function () {
        await expect(matchers.revertWithCustomErrorWithPair(1, 2))
          .to.be.revertedWithCustomError(matchers, "CustomErrorWithPair")
          .withArgs([1, 2]);

        await expectAssertionError(
          expect(matchers.revertWithCustomErrorWithUint(1, 2))
            .to.be.revertedWithCustomError(matchers, "CustomErrorWithPair")
            .withArgs([3, 2]),
          "expected 1 to equal 3"
        );
      });

      it("should fail if withArgs is called on its own", async function () {
        expect(() =>
          expect(matchers.revertWithCustomErrorWithUint(1))
            // @ts-expect-error
            .withArgs(1)
        ).to.throw(
          Error,
          "withArgs called without a previous revertedWithCustomError assertion"
        );
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

        expect(() =>
          // @ts-expect-error
          expect(hash).to.be.revertedWith(10)
        ).to.throw(
          TypeError,
          "Expected a string as the expected reason string"
        );
      });

      it("the contract is not specified", async function () {
        expect(() =>
          expect(matchers.revertWithSomeCustomError())
            .to.be // @ts-expect-error
            .revertedWithCustomError("SomeCustomError")
        ).to.throw(
          TypeError,
          "The first argument of .revertedWithCustomError has to be the contract that defines the custom error"
        );
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
            matchers.connect(signer).revertsWithoutReasonString({
              gasLimit: 1_000_000,
            })
          ).to.not.be.reverted
        ).to.be.eventually.rejectedWith(
          "sender doesn't have enough funds to send tx"
        );
      });
    });
  }
});
