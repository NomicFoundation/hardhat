import { AssertionError, expect } from "chai";
import { ProviderError } from "hardhat/internal/core/providers/errors";
import path from "path";
import util from "util";

import {
  runSuccessfulAsserts,
  runFailedAsserts,
  useEnvironment,
  useEnvironmentWithNode,
} from "../helpers";

import "../../src/internal/add-chai-matchers";

describe("INTEGRATION: Reverted", function () {
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

    const mineRevertedTransaction = async (hre: any) => {
      await hre.network.provider.send("evm_setAutomine", [false]);

      const tx = await matchers.revertsWithoutReason({
        gasLimit: 1_000_000,
      });

      await hre.network.provider.send("hardhat_mine", []);
      await hre.network.provider.send("evm_setAutomine", [true]);

      return tx;
    };

    describe("with a string as its subject", function () {
      it("hash of a successful transaction", async function () {
        const { hash } = await mineSuccessfulTransaction(this.hre);

        await expectAssertionError(
          expect(hash).to.be.reverted,
          "Expected transaction to be reverted"
        );
        await expect(hash).to.not.be.reverted;
      });

      it("hash of a reverted transaction", async function () {
        const { hash } = await mineRevertedTransaction(this.hre);

        await expect(hash).to.be.reverted;
        await expectAssertionError(
          expect(hash).to.not.be.reverted,
          "Expected transaction NOT to be reverted"
        );
      });

      it("invalid string", async function () {
        await expect(expect("0x123").to.be.reverted).to.be.rejectedWith(
          TypeError,
          "Expected a valid transaction hash, but got '0x123'"
        );

        await expect(expect("0x123").to.not.be.reverted).to.be.rejectedWith(
          TypeError,
          "Expected a valid transaction hash, but got '0x123'"
        );
      });

      it("promise of a hash of a successful transaction", async function () {
        const { hash } = await mineSuccessfulTransaction(this.hre);

        await expectAssertionError(
          expect(Promise.resolve(hash)).to.be.reverted,
          "Expected transaction to be reverted"
        );
        await expect(Promise.resolve(hash)).to.not.be.reverted;
      });

      it("promise of a hash of a reverted transaction", async function () {
        const { hash } = await mineRevertedTransaction(this.hre);

        await expect(Promise.resolve(hash)).to.be.reverted;
        await expectAssertionError(
          expect(Promise.resolve(hash)).to.not.be.reverted,
          "Expected transaction NOT to be reverted"
        );
      });

      it("promise of an invalid string", async function () {
        await expect(
          expect(Promise.resolve("0x123")).to.be.reverted
        ).to.be.rejectedWith(
          TypeError,
          "Expected a valid transaction hash, but got '0x123'"
        );

        await expect(
          expect(Promise.resolve("0x123")).to.not.be.reverted
        ).to.be.rejectedWith(
          TypeError,
          "Expected a valid transaction hash, but got '0x123'"
        );
      });
    });

    describe("with a TxResponse as its subject", function () {
      it("TxResponse of a successful transaction", async function () {
        const tx = await mineSuccessfulTransaction(this.hre);

        await expectAssertionError(
          expect(tx).to.be.reverted,
          "Expected transaction to be reverted"
        );
        await expect(tx).to.not.be.reverted;
      });

      it("TxResponse of a reverted transaction", async function () {
        const tx = await mineRevertedTransaction(this.hre);

        await expect(tx).to.be.reverted;
        await expectAssertionError(
          expect(tx).to.not.be.reverted,
          "Expected transaction NOT to be reverted"
        );
      });

      it("promise of a TxResponse of a successful transaction", async function () {
        const txPromise = mineSuccessfulTransaction(this.hre);

        await expectAssertionError(
          expect(txPromise).to.be.reverted,
          "Expected transaction to be reverted"
        );
        await expect(txPromise).to.not.be.reverted;
      });

      it("promise of a TxResponse of a reverted transaction", async function () {
        const txPromise = mineRevertedTransaction(this.hre);

        await expect(txPromise).to.be.reverted;
        await expectAssertionError(
          expect(txPromise).to.not.be.reverted,
          "Expected transaction NOT to be reverted"
        );
      });
    });

    describe("with a TxReceipt as its subject", function () {
      it("TxReceipt of a successful transaction", async function () {
        const tx = await mineSuccessfulTransaction(this.hre);
        const receipt = await tx.wait();

        await expectAssertionError(
          expect(receipt).to.be.reverted,
          "Expected transaction to be reverted"
        );
        await expect(receipt).to.not.be.reverted;
      });

      it("TxReceipt of a reverted transaction", async function () {
        const tx = await mineRevertedTransaction(this.hre);
        const receipt = await this.hre.ethers.provider.waitForTransaction(
          tx.hash
        ); // tx.wait rejects, so we use provider.waitForTransaction

        await expect(receipt).to.be.reverted;
        await expectAssertionError(
          expect(receipt).to.not.be.reverted,
          "Expected transaction NOT to be reverted"
        );
      });

      it("promise of a TxReceipt of a successful transaction", async function () {
        const tx = await mineSuccessfulTransaction(this.hre);
        const receiptPromise = tx.wait();

        await expectAssertionError(
          expect(receiptPromise).to.be.reverted,
          "Expected transaction to be reverted"
        );
        await expect(receiptPromise).to.not.be.reverted;
      });

      it("promise of a TxReceipt of a reverted transaction", async function () {
        const tx = await mineRevertedTransaction(this.hre);
        const receiptPromise = this.hre.ethers.provider.waitForTransaction(
          tx.hash
        ); // tx.wait rejects, so we use provider.waitForTransaction

        await expect(receiptPromise).to.be.reverted;
        await expectAssertionError(
          expect(receiptPromise).to.not.be.reverted,
          "Expected transaction NOT to be reverted"
        );
      });
    });

    describe("calling a contract method that succeeds", function () {
      it("successful asserts", async function () {
        await runSuccessfulAsserts({
          matchers,
          method: "succeeds",
          args: [],
          successfulAssert: (x) => expect(x).to.not.be.reverted,
        });
      });

      it("failed asserts", async function () {
        await runFailedAsserts({
          matchers,
          method: "succeeds",
          args: [],
          failedAssert: (x) => expect(x).to.be.reverted,
          failedAssertReason: "Expected transaction to be reverted",
        });
      });
    });

    describe("calling a method that reverts without a reason", function () {
      // depends on a bug being fixed on ethers.js
      // see https://linear.app/nomic-foundation/issue/HH-725
      it.skip("successful asserts", async function () {
        await runSuccessfulAsserts({
          matchers,
          method: "revertsWithoutReason",
          args: [],
          successfulAssert: (x) => expect(x).to.be.reverted,
        });
      });

      // depends on a bug being fixed on ethers.js
      // see https://linear.app/nomic-foundation/issue/HH-725
      it.skip("failed asserts", async function () {
        await runFailedAsserts({
          matchers,
          method: "revertsWithoutReason",
          args: [],
          failedAssert: (x) => expect(x).not.to.be.reverted,
          failedAssertReason: "Expected transaction NOT to be reverted",
        });
      });
    });

    describe("calling a method that reverts with a reason string", function () {
      it("successful asserts", async function () {
        await runSuccessfulAsserts({
          matchers,
          method: "revertsWith",
          args: ["some reason"],
          successfulAssert: (x) => expect(x).to.be.reverted,
        });
      });

      it("failed asserts", async function () {
        await runFailedAsserts({
          matchers,
          method: "revertsWith",
          args: ["some reason"],
          failedAssert: (x) => expect(x).not.to.be.reverted,
          failedAssertReason:
            "Expected transaction NOT to be reverted, but it reverted with reason 'some reason'",
        });
      });
    });

    describe("calling a method that reverts with a panic code", function () {
      it("successful asserts", async function () {
        await runSuccessfulAsserts({
          matchers,
          method: "panicAssert",
          args: [],
          successfulAssert: (x) => expect(x).to.be.reverted,
        });
      });

      it("failed asserts", async function () {
        await runFailedAsserts({
          matchers,
          method: "panicAssert",
          args: [],
          failedAssert: (x) => expect(x).not.to.be.reverted,
          failedAssertReason:
            "Expected transaction NOT to be reverted, but it reverted with panic code 0x01 (Assertion error)",
        });
      });
    });

    describe("calling a method that reverts with a custom error", function () {
      it("successful asserts", async function () {
        await runSuccessfulAsserts({
          matchers,
          method: "revertWithSomeCustomError",
          args: [],
          successfulAssert: (x) => expect(x).to.be.reverted,
        });
      });

      it("failed asserts", async function () {
        await runFailedAsserts({
          matchers,
          method: "revertWithSomeCustomError",
          args: [],
          failedAssert: (x) => expect(x).not.to.be.reverted,
          failedAssertReason: "Expected transaction NOT to be reverted",
        });
      });
    });

    describe("invalid rejection values", function () {
      it("non-errors", async function () {
        await expectAssertionError(
          expect(Promise.reject({})).to.be.reverted,
          "Expected an Error object"
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
            matchers.connect(signer).revertsWithoutReason({
              gasLimit: 1_000_000,
            })
          ).to.not.be.reverted
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
          await expect(matchers.succeeds()).to.be.reverted;
        } catch (e: any) {
          expect(util.inspect(e)).to.include(
            path.join("test", "reverted", "reverted.ts")
          );

          return;
        }

        expect.fail("Expected an exception but none was thrown");
      });
    });
  }
});
