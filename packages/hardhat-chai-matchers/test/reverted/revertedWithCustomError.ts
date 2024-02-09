import { AssertionError, expect } from "chai";
import { ProviderError } from "hardhat/internal/core/providers/errors";
import path from "path";
import util from "util";

import {
  runSuccessfulAsserts,
  runFailedAsserts,
  useEnvironment,
  useEnvironmentWithNode,
  mineSuccessfulTransaction,
} from "../helpers";

import "../../src/internal/add-chai-matchers";
import { anyUint, anyValue } from "../../src/withArgs";
import { MatchersContract } from "../contracts";

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
    let matchers: MatchersContract;
    beforeEach("deploy matchers contract", async function () {
      const Matchers = await this.hre.ethers.getContractFactory<
        [],
        MatchersContract
      >("Matchers");

      matchers = await Matchers.deploy();
    });

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

    describe("calling a method that reverts without a reason", function () {
      it("successful asserts", async function () {
        await runSuccessfulAsserts({
          matchers,
          method: "revertsWithoutReason",
          successfulAssert: (x) =>
            expect(x).to.not.be.revertedWithCustomError(
              matchers,
              "SomeCustomError"
            ),
        });
      });

      // depends on a bug being fixed on ethers.js
      // see https://github.com/NomicFoundation/hardhat/issues/3446
      it.skip("failed asserts", async function () {
        await runFailedAsserts({
          matchers,
          method: "revertsWithoutReason",
          failedAssert: (x) =>
            expect(x).to.be.revertedWithCustomError(
              matchers,
              "SomeCustomError"
            ),
          failedAssertReason:
            "Expected transaction to be reverted with custom error 'SomeCustomError', but it reverted without a reason",
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
            "Expected transaction NOT to be reverted with custom error 'SomeCustomError', but it was",
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
      describe("one argument", async function () {
        it("Should match correct argument", async function () {
          await expect(matchers.revertWithCustomErrorWithUint(1))
            .to.be.revertedWithCustomError(matchers, "CustomErrorWithUint")
            .withArgs(1);
        });

        it("Should fail if wrong argument", async function () {
          await expect(
            expect(matchers.revertWithCustomErrorWithUint(1))
              .to.be.revertedWithCustomError(matchers, "CustomErrorWithUint")
              .withArgs(2)
          ).to.be.rejectedWith(
            AssertionError,
            'Error in "CustomErrorWithUint" custom error: Error in the 1st argument assertion: expected 1 to equal 2.'
          );
        });
      });

      describe("two arguments", function () {
        it("Should match correct values", async function () {
          await expect(
            matchers.revertWithCustomErrorWithUintAndString(1, "foo")
          )
            .to.be.revertedWithCustomError(
              matchers,
              "CustomErrorWithUintAndString"
            )
            .withArgs(1, "foo");
        });

        it("Should fail if uint is wrong", async function () {
          await expect(
            expect(matchers.revertWithCustomErrorWithUintAndString(1, "foo"))
              .to.be.revertedWithCustomError(
                matchers,
                "CustomErrorWithUintAndString"
              )
              .withArgs(2, "foo")
          ).to.be.rejectedWith(
            AssertionError,
            'Error in "CustomErrorWithUintAndString" custom error: Error in the 1st argument assertion: expected 1 to equal 2.'
          );
        });

        it("Should fail if string is wrong", async function () {
          await expect(
            expect(matchers.revertWithCustomErrorWithUintAndString(1, "foo"))
              .to.be.revertedWithCustomError(
                matchers,
                "CustomErrorWithUintAndString"
              )
              .withArgs(1, "bar")
          ).to.be.rejectedWith(
            AssertionError,
            "Error in \"CustomErrorWithUintAndString\" custom error: Error in the 2nd argument assertion: expected 'foo' to equal 'bar'"
          );
        });

        it("Should fail if first predicate throws", async function () {
          await expect(
            expect(matchers.revertWithCustomErrorWithUintAndString(1, "foo"))
              .to.be.revertedWithCustomError(
                matchers,
                "CustomErrorWithUintAndString"
              )
              .withArgs(() => {
                throw new Error("user-defined error");
              }, "foo")
          ).to.be.rejectedWith(
            Error,
            'Error in "CustomErrorWithUintAndString" custom error: Error in the 1st argument assertion: The predicate threw when called: user-defined error'
          );
        });
      });

      describe("different number of arguments", function () {
        it("Should reject if expected fewer arguments", async function () {
          await expect(
            expect(matchers.revertWithCustomErrorWithUintAndString(1, "s"))
              .to.be.revertedWithCustomError(
                matchers,
                "CustomErrorWithUintAndString"
              )
              .withArgs(1)
          ).to.be.rejectedWith(
            AssertionError,
            'Error in "CustomErrorWithUintAndString" custom error: Expected arguments array to have length 1, but it has 2'
          );
        });

        it("Should reject if expected more arguments", async function () {
          await expect(
            expect(matchers.revertWithCustomErrorWithUintAndString(1, "s"))
              .to.be.revertedWithCustomError(
                matchers,
                "CustomErrorWithUintAndString"
              )
              .withArgs(1, "s", 3)
          ).to.be.rejectedWith(
            AssertionError,
            'Error in "CustomErrorWithUintAndString" custom error: Expected arguments array to have length 3, but it has 2'
          );
        });
      });

      describe("nested arguments", function () {
        it("should match correct arguments", async function () {
          await expect(matchers.revertWithCustomErrorWithPair(1, 2))
            .to.be.revertedWithCustomError(matchers, "CustomErrorWithPair")
            .withArgs([1, 2]);
        });

        it("should reject different arguments", async function () {
          await expect(
            expect(matchers.revertWithCustomErrorWithPair(1, 2))
              .to.be.revertedWithCustomError(matchers, "CustomErrorWithPair")
              .withArgs([3, 2])
          ).to.be.rejectedWith(
            AssertionError,
            'Error in "CustomErrorWithPair" custom error: Error in the 1st argument assertion: Error in the 1st argument assertion: expected 1 to equal 3.'
          );
        });
      });

      describe("array of different lengths", async function () {
        it("Should fail if the expected array is bigger", async function () {
          await expect(
            expect(matchers.revertWithCustomErrorWithPair(1, 2))
              .to.be.revertedWithCustomError(matchers, "CustomErrorWithPair")
              .withArgs([1])
          ).to.be.rejectedWith(
            AssertionError,
            'Error in "CustomErrorWithPair" custom error: Error in the 1st argument assertion: Expected arguments array to have length 1, but it has 2'
          );
        });

        it("Should fail if the expected array is smaller", async function () {
          await expect(
            expect(matchers.revertWithCustomErrorWithPair(1, 2))
              .to.be.revertedWithCustomError(matchers, "CustomErrorWithPair")
              .withArgs([1, 2, 3])
          ).to.be.rejectedWith(
            AssertionError,
            'Error in "CustomErrorWithPair" custom error: Error in the 1st argument assertion: Expected arguments array to have length 3, but it has 2'
          );
        });
      });

      it("Should fail when used with .not.", async function () {
        expect(() =>
          expect(matchers.revertWithSomeCustomError())
            .to.not.be.revertedWithCustomError(matchers, "SomeCustomError")
            .withArgs(1)
        ).to.throw(Error, "Do not combine .not. with .withArgs()");
      });

      it("should fail if withArgs is called on its own", async function () {
        expect(() =>
          expect(matchers.revertWithCustomErrorWithUint(1))
            // @ts-expect-error
            .withArgs(1)
        ).to.throw(
          Error,
          "withArgs can only be used in combination with a previous .emit or .revertedWithCustomError assertion"
        );
      });

      // TODO: re-enable this test when proper async chaining is implemented.
      // See https://github.com/NomicFoundation/hardhat/issues/4235
      it.skip("should fail if both emit and revertedWithCustomError are called", async function () {
        expect(() =>
          expect(matchers.revertWithSomeCustomError())
            .to.emit(matchers, "SomeEvent")
            .and.to.be.revertedWithCustomError(matchers, "SomeCustomError")
            .withArgs(1)
        ).to.throw(
          Error,
          "withArgs called with both .emit and .revertedWithCustomError, but these assertions cannot be combined"
        );
      });

      describe("Should handle argument predicates", function () {
        it("Should pass when a predicate argument returns true", async function () {
          await expect(matchers.revertWithCustomErrorWithUint(1))
            .to.be.revertedWithCustomError(matchers, "CustomErrorWithUint")
            .withArgs(anyValue);
          await expect(matchers.revertWithCustomErrorWithUint(1))
            .to.be.revertedWithCustomError(matchers, "CustomErrorWithUint")
            .withArgs(anyUint);
        });

        it("Should fail when a predicate argument returns false", async function () {
          await expect(
            expect(matchers.revertWithCustomErrorWithUint(1))
              .to.be.revertedWithCustomError(matchers, "CustomErrorWithUint")
              .withArgs(() => false)
          ).to.be.rejectedWith(
            AssertionError,
            'Error in "CustomErrorWithUint" custom error: Error in the 1st argument assertion: The predicate did not return true'
          );
        });

        it("Should fail when a predicate argument throws an error", async function () {
          await expect(
            expect(matchers.revertWithCustomErrorWithInt(-1))
              .to.be.revertedWithCustomError(matchers, "CustomErrorWithInt")
              .withArgs(anyUint)
          ).to.be.rejectedWith(
            AssertionError,
            'Error in "CustomErrorWithInt" custom error: Error in the 1st argument assertion: The predicate threw when called: anyUint expected its argument to be an unsigned integer, but it was negative, with value -1'
          );
        });
      });
    });

    describe("invalid values", function () {
      it("non-errors as subject", async function () {
        await expect(
          expect(Promise.reject({})).to.be.revertedWithCustomError(
            matchers,
            "SomeCustomError"
          )
        ).to.be.rejectedWith(AssertionError, "Expected an Error object");
      });

      it("non-string as expectation", async function () {
        const { hash } = await mineSuccessfulTransaction(this.hre);

        expect(() =>
          // @ts-expect-error
          expect(hash).to.be.revertedWith(10)
        ).to.throw(TypeError, "Expected the revert reason to be a string");
      });

      it("the contract is not specified", async function () {
        expect(() =>
          expect(matchers.revertWithSomeCustomError())
            .to.be // @ts-expect-error
            .revertedWithCustomError("SomeCustomError")
        ).to.throw(
          TypeError,
          "The first argument of .revertedWithCustomError must be the contract that defines the custom error"
        );
      });

      it("the contract doesn't have a custom error with that name", async function () {
        expect(() =>
          expect(
            matchers.revertWithSomeCustomError()
          ).to.be.revertedWithCustomError(matchers, "SomeCustmError")
        ).to.throw(
          Error,
          "The given contract doesn't have a custom error named 'SomeCustmError'"
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
        const matchersFromSenderWithoutFunds = matchers.connect(
          signer
        ) as MatchersContract;

        // this transaction will fail because of lack of funds, not because of a
        // revert
        await expect(
          expect(
            matchersFromSenderWithoutFunds.revertsWithoutReason({
              gasLimit: 1_000_000,
            })
          ).to.not.be.revertedWithCustomError(matchers, "SomeCustomError")
        ).to.be.eventually.rejectedWith(
          ProviderError,
          "sender doesn't have enough funds to send tx"
        );
      });

      it("extra arguments", async function () {
        expect(() =>
          expect(
            matchers.revertWithSomeCustomError()
          ).to.be.revertedWithCustomError(
            matchers,
            "SomeCustomError",
            // @ts-expect-error
            "extraArgument"
          )
        ).to.throw(
          Error,
          "`.revertedWithCustomError` expects only two arguments: the contract and the error name. Arguments should be asserted with the `.withArgs` helper."
        );
      });
    });

    describe("stack traces", function () {
      // smoke test for stack traces
      it("includes test file", async function () {
        try {
          await expect(
            matchers.revertsWith("some reason")
          ).to.be.revertedWithCustomError(matchers, "SomeCustomError");
        } catch (e: any) {
          const errorString = util.inspect(e);
          expect(errorString).to.include(
            "Expected transaction to be reverted with custom error 'SomeCustomError', but it reverted with reason 'some reason'"
          );
          expect(errorString).to.include(
            path.join("test", "reverted", "revertedWithCustomError.ts")
          );

          return;
        }

        expect.fail("Expected an exception but none was thrown");
      });
    });
  }
});
