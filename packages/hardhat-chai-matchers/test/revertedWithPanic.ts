import { AssertionError, expect } from "chai";

import "../src";
import { PANIC_CODES } from "../src/panic";
import { useEnvironment, useEnvironmentWithNode } from "./helpers";

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

    describe("calling a contract method that succeeds", function () {
      it("a write method that succeeds", async function () {
        await expectAssertionError(
          expect(matchers.succeeds()).to.be.revertedWithPanic(),
          "Expected transaction to be reverted with some panic code, but it didn't revert"
        );
        await expectAssertionError(
          expect(matchers.succeeds()).to.be.revertedWithPanic(
            PANIC_CODES.ASSERTION_ERROR
          ),
          "Expected transaction to be reverted with panic code 0x01 (Assertion error), but it didn't revert"
        );
        await expect(matchers.succeeds()).to.not.be.revertedWithPanic(
          PANIC_CODES.ASSERTION_ERROR
        );
      });

      it("a view method that succeeds", async function () {
        await expectAssertionError(
          expect(matchers.succeedsView()).to.be.revertedWithPanic(),
          "Expected transaction to be reverted with some panic code, but it didn't revert"
        );
        await expectAssertionError(
          expect(matchers.succeedsView()).to.be.revertedWithPanic(
            PANIC_CODES.ARITHMETIC_UNDER_OR_OVERFLOW
          ),
          "Expected transaction to be reverted with panic code 0x11 (Arithmetic operation underflowed or overflowed outside of an unchecked block), but it didn't revert"
        );
        await expect(matchers.succeedsView()).to.not.be.revertedWithPanic(
          PANIC_CODES.ASSERTION_ERROR
        );
      });

      it("a gas estimation that succeeds", async function () {
        await expectAssertionError(
          expect(matchers.estimateGas.succeeds()).to.be.revertedWithPanic(),
          "Expected transaction to be reverted with some panic code, but it didn't revert"
        );
        await expectAssertionError(
          expect(matchers.estimateGas.succeeds()).to.be.revertedWithPanic(
            PANIC_CODES.ASSERTION_ERROR
          ),
          "Expected transaction to be reverted with panic code 0x01 (Assertion error), but it didn't revert"
        );
        await expect(
          matchers.estimateGas.succeeds()
        ).to.not.be.revertedWithPanic(PANIC_CODES.ASSERTION_ERROR);
      });

      it("a static call of a write method that succeeds", async function () {
        await expectAssertionError(
          expect(matchers.callStatic.succeeds()).to.be.revertedWithPanic(),
          "Expected transaction to be reverted with some panic code, but it didn't revert"
        );
        await expectAssertionError(
          expect(matchers.callStatic.succeeds()).to.be.revertedWithPanic(
            PANIC_CODES.ASSERTION_ERROR
          ),
          "Expected transaction to be reverted with panic code 0x01 (Assertion error), but it didn't revert"
        );
        await expect(
          matchers.callStatic.succeeds()
        ).to.not.be.revertedWithPanic(PANIC_CODES.ASSERTION_ERROR);
      });
    });

    describe("calling a contract method that reverts", function () {
      it("a write method that reverts", async function () {
        // successful assertions
        await expect(matchers.panicAssert()).to.be.revertedWithPanic();
        await expect(matchers.panicAssert()).to.be.revertedWithPanic(
          PANIC_CODES.ASSERTION_ERROR
        );
        await expect(
          matchers.revertsWith("some reason")
        ).to.not.be.revertedWithPanic();
        await expect(matchers.panicAssert()).to.not.be.revertedWithPanic(
          PANIC_CODES.ARITHMETIC_UNDER_OR_OVERFLOW
        );

        // failed assertions
        await expectAssertionError(
          expect(matchers.revertsWith("some reason")).to.be.revertedWithPanic(),
          "Expected transaction to be reverted with some panic code, but it reverted with reason 'some reason'"
        );
        await expectAssertionError(
          expect(matchers.revertsWith("some reason")).to.be.revertedWithPanic(
            PANIC_CODES.ASSERTION_ERROR
          ),
          "Expected transaction to be reverted with panic code 0x01 (Assertion error), but it reverted with reason 'some reason'"
        );

        await expectAssertionError(
          expect(
            matchers.revertsWithoutReasonString()
          ).to.be.revertedWithPanic(),
          "Expected transaction to be reverted with some panic code, but it reverted without a reason string"
        );
        await expectAssertionError(
          expect(matchers.revertsWithoutReasonString()).to.be.revertedWithPanic(
            PANIC_CODES.ASSERTION_ERROR
          ),
          "Expected transaction to be reverted with panic code 0x01 (Assertion error), but it reverted without a reason string"
        );

        await expectAssertionError(
          expect(matchers.panicAssert()).to.not.be.revertedWithPanic(),
          "Expected transaction NOT to be reverted with some panic code, but it reverted with panic code 0x01 (Assertion error)"
        );
        await expectAssertionError(
          expect(matchers.panicAssert()).to.not.be.revertedWithPanic(
            PANIC_CODES.ASSERTION_ERROR
          ),
          "Expected transaction NOT to be reverted with panic code 0x01 (Assertion error), but it did"
        );
        await expectAssertionError(
          expect(matchers.panicUnderflow(0)).to.be.revertedWithPanic(
            PANIC_CODES.ASSERTION_ERROR
          ),
          "Expected transaction to be reverted with panic code 0x01 (Assertion error), but it reverted with panic code 0x11 (Arithmetic operation underflowed or overflowed outside of an unchecked block)"
        );
      });

      it("a view method that reverts", async function () {
        // successful assertions
        await expect(matchers.panicAssertView()).to.be.revertedWithPanic();
        await expect(matchers.panicAssertView()).to.be.revertedWithPanic(
          PANIC_CODES.ASSERTION_ERROR
        );
        await expect(
          matchers.revertsWithView("some reason")
        ).to.not.be.revertedWithPanic();
        await expect(matchers.panicAssertView()).to.not.be.revertedWithPanic(
          PANIC_CODES.ARITHMETIC_UNDER_OR_OVERFLOW
        );

        // failed assertions
        await expectAssertionError(
          expect(
            matchers.revertsWithView("some reason")
          ).to.be.revertedWithPanic(),
          "Expected transaction to be reverted with some panic code, but it reverted with reason 'some reason'"
        );
        await expectAssertionError(
          expect(
            matchers.revertsWithView("some reason")
          ).to.be.revertedWithPanic(PANIC_CODES.ASSERTION_ERROR),
          "Expected transaction to be reverted with panic code 0x01 (Assertion error), but it reverted with reason 'some reason'"
        );

        await expectAssertionError(
          expect(
            matchers.revertsWithoutReasonStringView()
          ).to.be.revertedWithPanic(),
          "Expected transaction to be reverted with some panic code, but it reverted without a reason string"
        );
        await expectAssertionError(
          expect(
            matchers.revertsWithoutReasonStringView()
          ).to.be.revertedWithPanic(PANIC_CODES.ASSERTION_ERROR),
          "Expected transaction to be reverted with panic code 0x01 (Assertion error), but it reverted without a reason string"
        );

        await expectAssertionError(
          expect(matchers.panicAssertView()).to.not.be.revertedWithPanic(),
          "Expected transaction NOT to be reverted with some panic code, but it reverted with panic code 0x01 (Assertion error)"
        );
        await expectAssertionError(
          expect(matchers.panicAssertView()).to.not.be.revertedWithPanic(
            PANIC_CODES.ASSERTION_ERROR
          ),
          "Expected transaction NOT to be reverted with panic code 0x01 (Assertion error), but it did"
        );
        await expectAssertionError(
          expect(matchers.panicUnderflowView(0)).to.be.revertedWithPanic(
            PANIC_CODES.ASSERTION_ERROR
          ),
          "Expected transaction to be reverted with panic code 0x01 (Assertion error), but it reverted with panic code 0x11 (Arithmetic operation underflowed or overflowed outside of an unchecked block)"
        );
      });

      it("a gas estimation that reverts", async function () {
        // successful assertions
        await expect(
          matchers.estimateGas.panicAssert()
        ).to.be.revertedWithPanic();
        await expect(
          matchers.estimateGas.panicAssert()
        ).to.be.revertedWithPanic(PANIC_CODES.ASSERTION_ERROR);
        await expect(
          matchers.estimateGas.revertsWith("some reason")
        ).to.not.be.revertedWithPanic();
        await expect(
          matchers.estimateGas.panicAssert()
        ).to.not.be.revertedWithPanic(PANIC_CODES.ARITHMETIC_UNDER_OR_OVERFLOW);

        // failed assertions
        await expectAssertionError(
          expect(
            matchers.estimateGas.revertsWith("some reason")
          ).to.be.revertedWithPanic(),
          "Expected transaction to be reverted with some panic code, but it reverted with reason 'some reason'"
        );
        await expectAssertionError(
          expect(
            matchers.estimateGas.revertsWith("some reason")
          ).to.be.revertedWithPanic(PANIC_CODES.ASSERTION_ERROR),
          "Expected transaction to be reverted with panic code 0x01 (Assertion error), but it reverted with reason 'some reason'"
        );

        await expectAssertionError(
          expect(
            matchers.estimateGas.revertsWithoutReasonString()
          ).to.be.revertedWithPanic(),
          "Expected transaction to be reverted with some panic code, but it reverted without a reason string"
        );
        await expectAssertionError(
          expect(
            matchers.estimateGas.revertsWithoutReasonString()
          ).to.be.revertedWithPanic(PANIC_CODES.ASSERTION_ERROR),
          "Expected transaction to be reverted with panic code 0x01 (Assertion error), but it reverted without a reason string"
        );

        await expectAssertionError(
          expect(
            matchers.estimateGas.panicAssert()
          ).to.not.be.revertedWithPanic(),
          "Expected transaction NOT to be reverted with some panic code, but it reverted with panic code 0x01 (Assertion error)"
        );
        await expectAssertionError(
          expect(
            matchers.estimateGas.panicAssert()
          ).to.not.be.revertedWithPanic(PANIC_CODES.ASSERTION_ERROR),
          "Expected transaction NOT to be reverted with panic code 0x01 (Assertion error), but it did"
        );
        await expectAssertionError(
          expect(
            matchers.estimateGas.panicUnderflow(0)
          ).to.be.revertedWithPanic(PANIC_CODES.ASSERTION_ERROR),
          "Expected transaction to be reverted with panic code 0x01 (Assertion error), but it reverted with panic code 0x11 (Arithmetic operation underflowed or overflowed outside of an unchecked block)"
        );
      });

      it("a static call of a write method that reverts", async function () {
        // successful assertions
        await expect(
          matchers.callStatic.panicAssert()
        ).to.be.revertedWithPanic();
        await expect(matchers.callStatic.panicAssert()).to.be.revertedWithPanic(
          PANIC_CODES.ASSERTION_ERROR
        );
        await expect(
          matchers.callStatic.revertsWith("some reason")
        ).to.not.be.revertedWithPanic();
        await expect(
          matchers.callStatic.panicAssert()
        ).to.not.be.revertedWithPanic(PANIC_CODES.ARITHMETIC_UNDER_OR_OVERFLOW);

        // failed assertions
        await expectAssertionError(
          expect(
            matchers.callStatic.revertsWith("some reason")
          ).to.be.revertedWithPanic(),
          "Expected transaction to be reverted with some panic code, but it reverted with reason 'some reason'"
        );
        await expectAssertionError(
          expect(
            matchers.callStatic.revertsWith("some reason")
          ).to.be.revertedWithPanic(PANIC_CODES.ASSERTION_ERROR),
          "Expected transaction to be reverted with panic code 0x01 (Assertion error), but it reverted with reason 'some reason'"
        );

        await expectAssertionError(
          expect(
            matchers.callStatic.revertsWithoutReasonString()
          ).to.be.revertedWithPanic(),
          "Expected transaction to be reverted with some panic code, but it reverted without a reason string"
        );
        await expectAssertionError(
          expect(
            matchers.callStatic.revertsWithoutReasonString()
          ).to.be.revertedWithPanic(PANIC_CODES.ASSERTION_ERROR),
          "Expected transaction to be reverted with panic code 0x01 (Assertion error), but it reverted without a reason string"
        );

        await expectAssertionError(
          expect(
            matchers.callStatic.panicAssert()
          ).to.not.be.revertedWithPanic(),
          "Expected transaction NOT to be reverted with some panic code, but it reverted with panic code 0x01 (Assertion error)"
        );
        await expectAssertionError(
          expect(matchers.callStatic.panicAssert()).to.not.be.revertedWithPanic(
            PANIC_CODES.ASSERTION_ERROR
          ),
          "Expected transaction NOT to be reverted with panic code 0x01 (Assertion error), but it did"
        );
        await expectAssertionError(
          expect(matchers.callStatic.panicUnderflow(0)).to.be.revertedWithPanic(
            PANIC_CODES.ASSERTION_ERROR
          ),
          "Expected transaction to be reverted with panic code 0x01 (Assertion error), but it reverted with panic code 0x11 (Arithmetic operation underflowed or overflowed outside of an unchecked block)"
        );
      });
    });

    describe("invalid values", function () {
      it("non-errors as subject", async function () {
        await expectAssertionError(
          expect(Promise.reject({})).to.be.revertedWithPanic(1),
          "Expected an Error object"
        );
      });

      it("non-number as expectation", async function () {
        const { hash } = await mineSuccessfulTransaction(this.hre);

        await expectAssertionError(
          expect(hash).to.be.revertedWithPanic("10" as any),
          "Expected a number or BigNumber as the expected panic code"
        );
      });
    });
  }
});
