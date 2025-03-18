import type { MatchersContract } from "../../helpers/contracts.js";
import type { HardhatEthers } from "@nomicfoundation/hardhat-ethers/types";
import type { EthereumProvider } from "hardhat/types/providers";

import path from "node:path";
import { before, beforeEach, describe, it } from "node:test";
import util from "node:util";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import {
  assertThrowsHardhatError,
  useEphemeralFixtureProject,
} from "@nomicfoundation/hardhat-test-utils";
import { AssertionError, expect } from "chai";

import { addChaiMatchers } from "../../../src/internal/add-chai-matchers.js";
import { PANIC_CODES } from "../../../src/panic.js";
import {
  runSuccessfulAsserts,
  runFailedAsserts,
  mineSuccessfulTransaction,
  initEnvironment,
} from "../../helpers/helpers.js";

addChaiMatchers();

describe("INTEGRATION: Reverted with panic", { timeout: 60000 }, () => {
  describe("with the in-process hardhat network", () => {
    useEphemeralFixtureProject("hardhat-project");
    runTests();
  });

  function runTests() {
    // deploy Matchers contract before each test
    let matchers: MatchersContract;

    let provider: EthereumProvider;
    let ethers: HardhatEthers;

    before(async () => {
      ({ ethers, provider } = await initEnvironment("reverted-with-panic"));
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
          successfulAssert: (x) => expect(x).not.to.be.revertedWithPanic(),
        });
        await runSuccessfulAsserts({
          matchers,
          method: "succeeds",
          successfulAssert: (x) =>
            expect(x).not.to.be.revertedWithPanic(PANIC_CODES.ASSERTION_ERROR),
        });
      });

      it("failed asserts", async () => {
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
            "Expected transaction to be reverted with panic code 0x1 (Assertion error), but it didn't revert",
        });
      });
    });

    describe("calling a method that reverts without a reason", () => {
      it("successful asserts", async () => {
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

      it("failed asserts", async () => {
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
            "Expected transaction to be reverted with panic code 0x1 (Assertion error), but it reverted without a reason",
        });
      });
    });

    describe("calling a method that reverts with a reason string", () => {
      it("successful asserts", async () => {
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

      it("failed asserts", async () => {
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
            "Expected transaction to be reverted with panic code 0x1 (Assertion error), but it reverted with reason 'some reason'",
        });
      });
    });

    describe("calling a method that reverts with a panic code", () => {
      it("successful asserts", async () => {
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

      it("failed asserts", async () => {
        await runFailedAsserts({
          matchers,
          method: "panicAssert",
          failedAssert: (x) => expect(x).to.not.be.revertedWithPanic(),
          failedAssertReason:
            "Expected transaction NOT to be reverted with some panic code, but it reverted with panic code 0x1 (Assertion error)",
        });

        await runFailedAsserts({
          matchers,
          method: "panicAssert",
          failedAssert: (x) =>
            expect(x).to.not.be.revertedWithPanic(PANIC_CODES.ASSERTION_ERROR),
          failedAssertReason:
            "Expected transaction NOT to be reverted with panic code 0x1 (Assertion error), but it was",
        });

        await runFailedAsserts({
          matchers,
          method: "panicAssert",
          failedAssert: (x) =>
            expect(x).to.be.revertedWithPanic(PANIC_CODES.ARITHMETIC_OVERFLOW),
          failedAssertReason:
            "Expected transaction to be reverted with panic code 0x11 (Arithmetic operation overflowed outside of an unchecked block), but it reverted with panic code 0x1 (Assertion error)",
        });
      });
    });

    describe("calling a method that reverts with a custom error", () => {
      it("successful asserts", async () => {
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

      it("failed asserts", async () => {
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
            "Expected transaction to be reverted with panic code 0x1 (Assertion error), but it reverted with a custom error",
        });
      });
    });

    describe("accepted panic code values", () => {
      it("number", async () => {
        await runSuccessfulAsserts({
          matchers,
          method: "succeeds",
          successfulAssert: (x) => expect(x).not.to.be.revertedWithPanic(1),
        });
      });

      it("bigint", async () => {
        await runSuccessfulAsserts({
          matchers,
          method: "succeeds",
          successfulAssert: (x) => expect(x).not.to.be.revertedWithPanic(1n),
        });
      });

      it("string", async () => {
        await runSuccessfulAsserts({
          matchers,
          method: "succeeds",
          successfulAssert: (x) => expect(x).not.to.be.revertedWithPanic("1"),
        });
      });
    });

    describe("invalid values", () => {
      it("non-errors as subject", async () => {
        await expect(
          expect(Promise.reject({})).to.be.revertedWithPanic(1),
        ).to.be.rejectedWith(AssertionError, "Expected an Error object");
      });

      it("non-number as expectation", async () => {
        const { hash } = await mineSuccessfulTransaction(provider, ethers);

        assertThrowsHardhatError(
          () => expect(hash).to.be.revertedWithPanic("invalid"),
          HardhatError.ERRORS.CHAI_MATCHERS.PANIC_CODE_EXPECTED,
          {
            panicCode: "invalid",
          },
        );
      });

      it("non-number as expectation, subject is a rejected promise", async () => {
        const tx = matchers.revertsWithoutReason();

        assertThrowsHardhatError(
          () => expect(tx).to.be.revertedWithPanic("invalid"),
          HardhatError.ERRORS.CHAI_MATCHERS.PANIC_CODE_EXPECTED,
          {
            panicCode: "invalid",
          },
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
          ).to.not.be.revertedWithPanic(),
        ).to.be.eventually.rejectedWith(
          "Sender doesn't have enough funds to send tx",
        );
      });
    });

    describe("stack traces", () => {
      // smoke test for stack traces
      it("includes test file", async () => {
        try {
          await expect(matchers.panicAssert()).to.not.be.revertedWithPanic();
        } catch (e) {
          const errorString = util.inspect(e);
          expect(errorString).to.include(
            "Expected transaction NOT to be reverted with some panic code, but it reverted with panic code 0x1 (Assertion error)",
          );
          expect(errorString).to.include(
            path.join("test", "matchers", "reverted", "revertedWithPanic.ts"),
          );
          return;
        }
        expect.fail("Expected an exception but none was thrown");
      });
    });
  }
});
