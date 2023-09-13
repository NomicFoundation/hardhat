import { AssertionError, expect } from "chai";
import { ProviderError } from "hardhat/internal/core/providers/errors";
import path from "path";
import util from "util";

import "../../src/internal/add-chai-matchers";
import { PANIC_CODES } from "../../src/panic";
import { MatchersContract } from "../contracts";
import {
  runSuccessfulAsserts,
  runFailedAsserts,
  useEnvironment,
  useEnvironmentWithNode,
  mineSuccessfulTransaction,
} from "../helpers";

describe("INTEGRATION: Reverted with panic", function () {
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
          successfulAssert: (x) => expect(x).not.to.be.revertedWithPanic(),
        });

        await runSuccessfulAsserts({
          matchers,
          method: "succeeds",
          successfulAssert: (x) =>
            expect(x).not.to.be.revertedWithPanic(PANIC_CODES.ASSERTION_ERROR),
        });
      });

      it("failed asserts", async function () {
        await runFailedAsserts({
          matchers,
          method: "succeeds",
          failedAssert: (x) => expect(x).to.be.revertedWithPanic(),
          failedAssertReason:
            "Expected transaction to be reverted with some panic code, but it didn't revert",
        });

        await runFailedAsserts({
          matchers,
          method: "succeeds",
          failedAssert: (x) =>
            expect(x).to.be.revertedWithPanic(PANIC_CODES.ASSERTION_ERROR),
          failedAssertReason:
            "Expected transaction to be reverted with panic code 0x01 (Assertion error), but it didn't revert",
        });
      });
    });

    describe("calling a method that reverts without a reason", function () {
      it("successful asserts", async function () {
        await runSuccessfulAsserts({
          matchers,
          method: "revertsWithoutReason",
          successfulAssert: (x) => expect(x).to.not.be.revertedWithPanic(),
        });

        await runSuccessfulAsserts({
          matchers,
          method: "revertsWithoutReason",
          successfulAssert: (x) =>
            expect(x).to.not.be.revertedWithPanic(PANIC_CODES.ASSERTION_ERROR),
        });
      });

      // depends on a bug being fixed on ethers.js
      // see https://github.com/NomicFoundation/hardhat/issues/3446
      it.skip("failed asserts", async function () {
        await runFailedAsserts({
          matchers,
          method: "revertsWithoutReason",
          failedAssert: (x) => expect(x).to.be.revertedWithPanic(),
          failedAssertReason:
            "Expected transaction to be reverted with some panic code, but it reverted without a reason",
        });

        await runFailedAsserts({
          matchers,
          method: "revertsWithoutReason",
          failedAssert: (x) =>
            expect(x).to.be.revertedWithPanic(PANIC_CODES.ASSERTION_ERROR),
          failedAssertReason:
            "Expected transaction to be reverted with panic code 0x01 (Assertion error), but it reverted without a reason",
        });
      });
    });

    describe("calling a method that reverts with a reason string", function () {
      it("successful asserts", async function () {
        await runSuccessfulAsserts({
          matchers,
          method: "revertsWith",
          args: ["some reason"],
          successfulAssert: (x) => expect(x).to.not.be.revertedWithPanic(),
        });

        await runSuccessfulAsserts({
          matchers,
          method: "revertsWith",
          args: ["some reason"],
          successfulAssert: (x) =>
            expect(x).to.not.be.revertedWithPanic(PANIC_CODES.ASSERTION_ERROR),
        });
      });

      it("failed asserts", async function () {
        await runFailedAsserts({
          matchers,
          method: "revertsWith",
          args: ["some reason"],
          failedAssert: (x) => expect(x).to.be.revertedWithPanic(),
          failedAssertReason:
            "Expected transaction to be reverted with some panic code, but it reverted with reason 'some reason'",
        });

        await runFailedAsserts({
          matchers,
          method: "revertsWith",
          args: ["some reason"],
          failedAssert: (x) =>
            expect(x).to.be.revertedWithPanic(PANIC_CODES.ASSERTION_ERROR),
          failedAssertReason:
            "Expected transaction to be reverted with panic code 0x01 (Assertion error), but it reverted with reason 'some reason'",
        });
      });
    });

    describe("calling a method that reverts with a panic code", function () {
      it("successful asserts", async function () {
        await runSuccessfulAsserts({
          matchers,
          method: "panicAssert",
          successfulAssert: (x) => expect(x).to.be.revertedWithPanic(),
        });

        await runSuccessfulAsserts({
          matchers,
          method: "panicAssert",
          successfulAssert: (x) =>
            expect(x).to.be.revertedWithPanic(PANIC_CODES.ASSERTION_ERROR),
        });
      });

      it("failed asserts", async function () {
        await runFailedAsserts({
          matchers,
          method: "panicAssert",
          failedAssert: (x) => expect(x).to.not.be.revertedWithPanic(),
          failedAssertReason:
            "Expected transaction NOT to be reverted with some panic code, but it reverted with panic code 0x01 (Assertion error)",
        });

        await runFailedAsserts({
          matchers,
          method: "panicAssert",
          failedAssert: (x) =>
            expect(x).to.not.be.revertedWithPanic(PANIC_CODES.ASSERTION_ERROR),
          failedAssertReason:
            "Expected transaction NOT to be reverted with panic code 0x01 (Assertion error), but it was",
        });

        await runFailedAsserts({
          matchers,
          method: "panicAssert",
          failedAssert: (x) =>
            expect(x).to.be.revertedWithPanic(
              PANIC_CODES.ARITHMETIC_UNDER_OR_OVERFLOW
            ),
          failedAssertReason:
            "Expected transaction to be reverted with panic code 0x11 (Arithmetic operation underflowed or overflowed outside of an unchecked block), but it reverted with panic code 0x01 (Assertion error)",
        });
      });
    });

    describe("calling a method that reverts with a custom error", function () {
      it("successful asserts", async function () {
        await runSuccessfulAsserts({
          matchers,
          method: "revertWithSomeCustomError",
          successfulAssert: (x) => expect(x).to.not.be.revertedWithPanic(),
        });

        await runSuccessfulAsserts({
          matchers,
          method: "revertWithSomeCustomError",
          successfulAssert: (x) =>
            expect(x).to.not.be.revertedWithPanic(PANIC_CODES.ASSERTION_ERROR),
        });
      });

      it("failed asserts", async function () {
        await runFailedAsserts({
          matchers,
          method: "revertWithSomeCustomError",
          failedAssert: (x) => expect(x).to.be.revertedWithPanic(),
          failedAssertReason:
            "Expected transaction to be reverted with some panic code, but it reverted with a custom error",
        });

        await runFailedAsserts({
          matchers,
          method: "revertWithSomeCustomError",
          failedAssert: (x) =>
            expect(x).to.be.revertedWithPanic(PANIC_CODES.ASSERTION_ERROR),
          failedAssertReason:
            "Expected transaction to be reverted with panic code 0x01 (Assertion error), but it reverted with a custom error",
        });
      });
    });

    describe("accepted panic code values", function () {
      it("number", async function () {
        await runSuccessfulAsserts({
          matchers,
          method: "succeeds",
          successfulAssert: (x) => expect(x).not.to.be.revertedWithPanic(1),
        });
      });

      it("bigint", async function () {
        await runSuccessfulAsserts({
          matchers,
          method: "succeeds",
          successfulAssert: (x) =>
            expect(x).not.to.be.revertedWithPanic(BigInt(1)),
        });
      });

      it("string", async function () {
        await runSuccessfulAsserts({
          matchers,
          method: "succeeds",
          successfulAssert: (x) => expect(x).not.to.be.revertedWithPanic("1"),
        });
      });
    });

    describe("invalid values", function () {
      it("non-errors as subject", async function () {
        await expect(
          expect(Promise.reject({})).to.be.revertedWithPanic(1)
        ).to.be.rejectedWith(AssertionError, "Expected an Error object");
      });

      it("non-number as expectation", async function () {
        const { hash } = await mineSuccessfulTransaction(this.hre);

        expect(() => expect(hash).to.be.revertedWithPanic("invalid")).to.throw(
          TypeError,
          "Expected the given panic code to be a number-like value, but got 'invalid'"
        );
      });

      it("non-number as expectation, subject is a rejected promise", async function () {
        const tx = matchers.revertsWithoutReason();

        expect(() => expect(tx).to.be.revertedWithPanic("invalid")).to.throw(
          TypeError,
          "Expected the given panic code to be a number-like value, but got 'invalid'"
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
          ).to.not.be.revertedWithPanic()
        ).to.be.eventually.rejectedWith(
          ProviderError,
          "sender doesn't have enough funds to send tx"
        );
      });
    });

    describe("stack traces", function () {
      // smoke test for stack traces
      it("includes test file", async function () {
        try {
          await expect(matchers.panicAssert()).to.not.be.revertedWithPanic();
        } catch (e: any) {
          const errorString = util.inspect(e);
          expect(errorString).to.include(
            "Expected transaction NOT to be reverted with some panic code, but it reverted with panic code 0x01 (Assertion error)"
          );
          expect(errorString).to.include(
            path.join("test", "reverted", "revertedWithPanic.ts")
          );

          return;
        }

        expect.fail("Expected an exception but none was thrown");
      });
    });
  }
});
