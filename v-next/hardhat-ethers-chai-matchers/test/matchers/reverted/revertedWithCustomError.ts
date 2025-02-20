import type { MatchersContract } from "../../helpers/contracts.js";
import type { HardhatEthers } from "@nomicfoundation/hardhat-ethers/types";
import type { EthereumProvider } from "hardhat/types/providers";

import path from "node:path";
import { before, beforeEach, describe, it } from "node:test";
import util from "node:util";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import {
  assertThrowsHardhatError,
  useFixtureProject,
} from "@nomicfoundation/hardhat-test-utils";
import { AssertionError, expect } from "chai";

import { addChaiMatchers } from "../../../src/internal/add-chai-matchers.js";
import { anyUint, anyValue } from "../../../src/withArgs.js";
import {
  runSuccessfulAsserts,
  runFailedAsserts,
  mineSuccessfulTransaction,
  initEnvironment,
} from "../../helpers/helpers.js";

addChaiMatchers();

describe("INTEGRATION: Reverted with custom error", { timeout: 60000 }, () => {
  describe("with the in-process hardhat network", () => {
    useFixtureProject("hardhat-project");
    runTests();
  });

  function runTests() {
    // deploy Matchers contract before each test
    let matchers: MatchersContract;

    let provider: EthereumProvider;
    let ethers: HardhatEthers;

    before(async () => {
      ({ ethers, provider } = await initEnvironment(
        "reverted-with-custom-error",
      ));
    });

    beforeEach(async () => {
      const Matchers = await ethers.getContractFactory<[], MatchersContract>(
        "Matchers",
      );

      matchers = await Matchers.deploy();
    });

    describe("calling a method that succeeds", () => {
      it("successful asserts", async () => {
        await runSuccessfulAsserts({
          matchers,
          method: "succeeds",
          successfulAssert: (x) =>
            expect(x).not.to.be.revertedWithCustomError(
              matchers,
              "SomeCustomError",
            ),
        });
      });

      it("failed asserts", async () => {
        await runFailedAsserts({
          matchers,
          method: "succeeds",
          failedAssert: (x) =>
            expect(x).to.be.revertedWithCustomError(
              matchers,
              "SomeCustomError",
            ),
          failedAssertReason:
            "Expected transaction to be reverted with custom error 'SomeCustomError', but it didn't revert",
        });
      });
    });

    describe("calling a method that reverts without a reason", () => {
      it("successful asserts", async () => {
        await runSuccessfulAsserts({
          matchers,
          method: "revertsWithoutReason",
          successfulAssert: (x) =>
            expect(x).to.not.be.revertedWithCustomError(
              matchers,
              "SomeCustomError",
            ),
        });
      });

      it("failed asserts", async () => {
        await runFailedAsserts({
          matchers,
          method: "revertsWithoutReason",
          failedAssert: (x) =>
            expect(x).to.be.revertedWithCustomError(
              matchers,
              "SomeCustomError",
            ),
          failedAssertReason:
            "Expected transaction to be reverted with custom error 'SomeCustomError', but it reverted without a reason",
        });
      });
    });

    describe("calling a method that reverts with a reason string", () => {
      it("successful asserts", async () => {
        await runSuccessfulAsserts({
          matchers,
          method: "revertsWith",
          args: ["some reason"],
          successfulAssert: (x) =>
            expect(x).to.not.be.revertedWithCustomError(
              matchers,
              "SomeCustomError",
            ),
        });
      });

      it("failed asserts", async () => {
        await runFailedAsserts({
          matchers,
          method: "revertsWith",
          args: ["some reason"],
          failedAssert: (x) =>
            expect(x).to.be.revertedWithCustomError(
              matchers,
              "SomeCustomError",
            ),
          failedAssertReason:
            "Expected transaction to be reverted with custom error 'SomeCustomError', but it reverted with reason 'some reason'",
        });
      });
    });

    describe("calling a method that reverts with a panic code", () => {
      it("successful asserts", async () => {
        await runSuccessfulAsserts({
          matchers,
          method: "panicAssert",
          successfulAssert: (x) =>
            expect(x).to.not.be.revertedWithCustomError(
              matchers,
              "SomeCustomError",
            ),
        });
      });

      it("failed asserts", async () => {
        await runFailedAsserts({
          matchers,
          method: "panicAssert",
          failedAssert: (x) =>
            expect(x).to.be.revertedWithCustomError(
              matchers,
              "SomeCustomError",
            ),
          failedAssertReason:
            "Expected transaction to be reverted with custom error 'SomeCustomError', but it reverted with panic code 0x1 (Assertion error)",
        });
      });
    });

    describe("calling a method that reverts with a custom error", () => {
      it("successful asserts", async () => {
        await runSuccessfulAsserts({
          matchers,
          method: "revertWithSomeCustomError",
          successfulAssert: (x) =>
            expect(x).to.be.revertedWithCustomError(
              matchers,
              "SomeCustomError",
            ),
        });

        await runSuccessfulAsserts({
          matchers,
          method: "revertWithAnotherCustomError",
          successfulAssert: (x) =>
            expect(x).to.not.be.revertedWithCustomError(
              matchers,
              "SomeCustomError",
            ),
        });
      });

      it("failed asserts: expected custom error not to match", async () => {
        await runFailedAsserts({
          matchers,
          method: "revertWithSomeCustomError",
          failedAssert: (x) =>
            expect(x).to.not.be.revertedWithCustomError(
              matchers,
              "SomeCustomError",
            ),
          failedAssertReason:
            "Expected transaction NOT to be reverted with custom error 'SomeCustomError', but it was",
        });
      });

      it("failed asserts: reverts with another custom error of the same contract", async () => {
        await runFailedAsserts({
          matchers,
          method: "revertWithAnotherCustomError",
          failedAssert: (x) =>
            expect(x).to.be.revertedWithCustomError(
              matchers,
              "SomeCustomError",
            ),
          failedAssertReason:
            "Expected transaction to be reverted with custom error 'SomeCustomError', but it reverted with custom error 'AnotherCustomError'",
        });
      });

      it("failed asserts: reverts with another custom error of another contract", async () => {
        await runFailedAsserts({
          matchers,
          method: "revertWithAnotherContractCustomError",
          failedAssert: (x) =>
            expect(x).to.be.revertedWithCustomError(
              matchers,
              "SomeCustomError",
            ),
          failedAssertReason:
            "Expected transaction to be reverted with custom error 'SomeCustomError', but it reverted with a different custom error",
        });
      });
    });

    describe("with args", () => {
      describe("one argument", () => {
        it("should match correct argument", async () => {
          await expect(matchers.revertWithCustomErrorWithUint(1))
            .to.be.revertedWithCustomError(matchers, "CustomErrorWithUint")
            .withArgs(1);
        });

        it("should fail if wrong argument", async () => {
          await expect(
            expect(matchers.revertWithCustomErrorWithUint(1))
              .to.be.revertedWithCustomError(matchers, "CustomErrorWithUint")
              .withArgs(2),
          ).to.be.rejectedWith(
            AssertionError,
            'Error in "CustomErrorWithUint" custom error: Error in the 1st argument assertion: expected 1 to equal 2.',
          );
        });
      });

      describe("two arguments", () => {
        it("should match correct values", async () => {
          await expect(
            matchers.revertWithCustomErrorWithUintAndString(1, "foo"),
          )
            .to.be.revertedWithCustomError(
              matchers,
              "CustomErrorWithUintAndString",
            )
            .withArgs(1, "foo");
        });

        it("should fail if uint is wrong", async () => {
          await expect(
            expect(matchers.revertWithCustomErrorWithUintAndString(1, "foo"))
              .to.be.revertedWithCustomError(
                matchers,
                "CustomErrorWithUintAndString",
              )
              .withArgs(2, "foo"),
          ).to.be.rejectedWith(
            AssertionError,
            'Error in "CustomErrorWithUintAndString" custom error: Error in the 1st argument assertion: expected 1 to equal 2.',
          );
        });

        it("should fail if string is wrong", async () => {
          await expect(
            expect(matchers.revertWithCustomErrorWithUintAndString(1, "foo"))
              .to.be.revertedWithCustomError(
                matchers,
                "CustomErrorWithUintAndString",
              )
              .withArgs(1, "bar"),
          ).to.be.rejectedWith(
            AssertionError,
            "Error in \"CustomErrorWithUintAndString\" custom error: Error in the 2nd argument assertion: expected 'foo' to equal 'bar'",
          );
        });

        it("should fail if first predicate throws", async () => {
          await expect(
            expect(matchers.revertWithCustomErrorWithUintAndString(1, "foo"))
              .to.be.revertedWithCustomError(
                matchers,
                "CustomErrorWithUintAndString",
              )
              .withArgs(() => {
                throw new Error("user-defined error");
              }, "foo"),
          ).to.be.rejectedWith(
            Error,
            'Error in "CustomErrorWithUintAndString" custom error: Error in the 1st argument assertion: The predicate threw when called: user-defined error',
          );
        });
      });

      describe("different number of arguments", () => {
        it("should reject if expected fewer arguments", async () => {
          await expect(
            expect(matchers.revertWithCustomErrorWithUintAndString(1, "s"))
              .to.be.revertedWithCustomError(
                matchers,
                "CustomErrorWithUintAndString",
              )
              .withArgs(1),
          ).to.be.rejectedWith(
            AssertionError,
            'Error in "CustomErrorWithUintAndString" custom error: Expected arguments array to have length 1, but it has 2',
          );
        });

        it("should reject if expected more arguments", async () => {
          await expect(
            expect(matchers.revertWithCustomErrorWithUintAndString(1, "s"))
              .to.be.revertedWithCustomError(
                matchers,
                "CustomErrorWithUintAndString",
              )
              .withArgs(1, "s", 3),
          ).to.be.rejectedWith(
            AssertionError,
            'Error in "CustomErrorWithUintAndString" custom error: Expected arguments array to have length 3, but it has 2',
          );
        });
      });

      describe("nested arguments", () => {
        it("should match correct arguments", async () => {
          await expect(matchers.revertWithCustomErrorWithPair(1, 2))
            .to.be.revertedWithCustomError(matchers, "CustomErrorWithPair")
            .withArgs([1, 2]);
        });

        it("should reject different arguments", async () => {
          await expect(
            expect(matchers.revertWithCustomErrorWithPair(1, 2))
              .to.be.revertedWithCustomError(matchers, "CustomErrorWithPair")
              .withArgs([3, 2]),
          ).to.be.rejectedWith(
            AssertionError,
            'Error in "CustomErrorWithPair" custom error: Error in the 1st argument assertion: Error in the 1st argument assertion: expected 1 to equal 3.',
          );
        });
      });

      describe("array of different lengths", () => {
        it("should fail if the expected array is bigger", async () => {
          await expect(
            expect(matchers.revertWithCustomErrorWithPair(1, 2))
              .to.be.revertedWithCustomError(matchers, "CustomErrorWithPair")
              .withArgs([1]),
          ).to.be.rejectedWith(
            AssertionError,
            'Error in "CustomErrorWithPair" custom error: Error in the 1st argument assertion: Expected arguments array to have length 1, but it has 2',
          );
        });

        it("should fail if the expected array is smaller", async () => {
          await expect(
            expect(matchers.revertWithCustomErrorWithPair(1, 2))
              .to.be.revertedWithCustomError(matchers, "CustomErrorWithPair")
              .withArgs([1, 2, 3]),
          ).to.be.rejectedWith(
            AssertionError,
            'Error in "CustomErrorWithPair" custom error: Error in the 1st argument assertion: Expected arguments array to have length 3, but it has 2',
          );
        });
      });

      it("should fail when used with .not.", async () => {
        expect(() =>
          expect(matchers.revertWithSomeCustomError())
            .to.not.be.revertedWithCustomError(matchers, "SomeCustomError")
            .withArgs(1),
        ).to.throw(Error, "Do not combine .not. with .withArgs()");
      });

      it("should fail if withArgs is called on its own", async () => {
        expect(() =>
          // @ts-expect-error -- force "withArgs" to be called on its own
          expect(matchers.revertWithCustomErrorWithUint(1)).withArgs(1),
        ).to.throw(
          Error,
          "withArgs can only be used in combination with a previous .emit or .revertedWithCustomError assertion",
        );
      });

      // See https://github.com/NomicFoundation/hardhat/issues/4235
      // it.skip("should fail if both emit and revertedWithCustomError are called", async () => {
      //   expect(() =>
      //     expect(matchers.revertWithSomeCustomError())
      //       .to.emit(matchers, "SomeEvent")
      //       .and.to.be.revertedWithCustomError(matchers, "SomeCustomError")
      //       .withArgs(1),
      //   ).to.throw(
      //     Error,
      //     "withArgs called with both .emit and .revertedWithCustomError, but these assertions cannot be combined",
      //   );
      // });

      describe("should handle argument predicates", () => {
        it("should pass when a predicate argument returns true", async () => {
          await expect(matchers.revertWithCustomErrorWithUint(1))
            .to.be.revertedWithCustomError(matchers, "CustomErrorWithUint")
            .withArgs(anyValue);
          await expect(matchers.revertWithCustomErrorWithUint(1))
            .to.be.revertedWithCustomError(matchers, "CustomErrorWithUint")
            .withArgs(anyUint);
        });

        it("should fail when a predicate argument returns false", async () => {
          await expect(
            expect(matchers.revertWithCustomErrorWithUint(1))
              .to.be.revertedWithCustomError(matchers, "CustomErrorWithUint")
              .withArgs(() => false),
          ).to.be.rejectedWith(
            AssertionError,
            'Error in "CustomErrorWithUint" custom error: Error in the 1st argument assertion: The predicate did not return true',
          );
        });

        it("should fail when a predicate argument throws an error", async () => {
          await expect(
            expect(matchers.revertWithCustomErrorWithInt(-1))
              .to.be.revertedWithCustomError(matchers, "CustomErrorWithInt")
              .withArgs(anyUint),
          ).to.be.rejectedWith(
            AssertionError,
            'Error in "CustomErrorWithInt" custom error: Error in the 1st argument assertion: The predicate threw when called: anyUint expected its argument to be an unsigned integer, but it was negative, with value -1',
          );
        });
      });
    });

    describe("invalid values", () => {
      it("non-errors as subject", async () => {
        await expect(
          expect(Promise.reject({})).to.be.revertedWithCustomError(
            matchers,
            "SomeCustomError",
          ),
        ).to.be.rejectedWith(AssertionError, "Expected an Error object");
      });

      it("non-string as expectation", async () => {
        const { hash } = await mineSuccessfulTransaction(provider, ethers);

        assertThrowsHardhatError(
          // @ts-expect-error -- force error scenario: reason should be a string or a regular expression
          () => expect(hash).to.be.revertedWith(10),
          HardhatError.ERRORS.CHAI_MATCHERS
            .EXPECT_STRING_OR_REGEX_AS_REVERT_REASON,
          {},
        );
      });

      it("the contract is not specified", async () => {
        assertThrowsHardhatError(
          () =>
            expect(
              matchers.revertWithSomeCustomError(),
              // @ts-expect-error -- force error scenario: contract should be specified
            ).to.be.revertedWithCustomError("SomeCustomError"),
          HardhatError.ERRORS.CHAI_MATCHERS.FIRST_ARGUMENT_MUST_BE_A_CONTRACT,
          {},
        );
      });

      it("the contract doesn't have a custom error with that name", async () => {
        assertThrowsHardhatError(
          () =>
            expect(
              matchers.revertWithSomeCustomError(),
            ).to.be.revertedWithCustomError(matchers, "SomeCustmError"),
          HardhatError.ERRORS.CHAI_MATCHERS.CONTRACT_DOES_NOT_HAVE_CUSTOM_ERROR,
          { customErrorName: "SomeCustmError" },
        );
      });

      it("errors that are not related to a reverted transaction", async () => {
        // use an address that almost surely doesn't have balance
        const randomPrivateKey =
          "0xc5c587cc6e48e9692aee0bf07474118e6d830c11905f7ec7ff32c09c99eba5f9";
        const signer = new ethers.Wallet(randomPrivateKey, ethers.provider);

        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- the contract is of type MatchersContract
        const matchersFromSenderWithoutFunds = matchers.connect(
          signer,
        ) as MatchersContract;

        // this transaction will fail because of lack of funds, not because of a
        // revert
        await expect(
          expect(
            matchersFromSenderWithoutFunds.revertsWithoutReason({
              gasLimit: 1_000_000,
            }),
          ).to.not.be.revertedWithCustomError(matchers, "SomeCustomError"),
        ).to.be.eventually.rejectedWith(
          "Sender doesn't have enough funds to send tx",
        );
      });

      it("extra arguments", async () => {
        assertThrowsHardhatError(
          () =>
            expect(
              matchers.revertWithSomeCustomError(),
            ).to.be.revertedWithCustomError(
              matchers,
              "SomeCustomError",
              // @ts-expect-error -- force error scenario: extra arguments should not be specified
              "extraArgument",
            ),
          HardhatError.ERRORS.CHAI_MATCHERS.REVERT_INVALID_ARGUMENTS_LENGTH,
          {},
        );
      });
    });

    describe("stack traces", () => {
      // smoke test for stack traces
      it("includes test file", async () => {
        try {
          await expect(
            matchers.revertsWith("some reason"),
          ).to.be.revertedWithCustomError(matchers, "SomeCustomError");
        } catch (e) {
          const errorString = util.inspect(e);
          expect(errorString).to.include(
            "Expected transaction to be reverted with custom error 'SomeCustomError', but it reverted with reason 'some reason'",
          );
          expect(errorString).to.include(
            path.join(
              "test",
              "matchers",
              "reverted",
              "revertedWithCustomError.ts",
            ),
          );
          return;
        }
        expect.fail("Expected an exception but none was thrown");
      });
    });
  }
});
