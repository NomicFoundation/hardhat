import { AssertionError, expect } from "chai";
import { useEnvironment, useEnvironmentWithNode } from "./helpers";

import "../src";

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

      const tx = await matchers.revertsWithoutReasonString({
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
        await expectAssertionError(
          expect("0x123").to.be.reverted,
          "Expected a valid transaction hash, but got '0x123'"
        );

        await expectAssertionError(
          expect("0x123").to.not.be.reverted,
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
        await expectAssertionError(
          expect(Promise.resolve("0x123")).to.be.reverted,
          "Expected a valid transaction hash, but got '0x123'"
        );

        await expectAssertionError(
          expect(Promise.resolve("0x123")).to.not.be.reverted,
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
        const tx = await mineSuccessfulTransaction(this.hre);

        await expectAssertionError(
          expect(Promise.resolve(tx)).to.be.reverted,
          "Expected transaction to be reverted"
        );
        await expect(Promise.resolve(tx)).to.not.be.reverted;
      });

      it("promise of a TxResponse of a reverted transaction", async function () {
        const tx = await mineRevertedTransaction(this.hre);

        await expect(Promise.resolve(tx)).to.be.reverted;
        await expectAssertionError(
          expect(Promise.resolve(tx)).to.not.be.reverted,
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
        const receipt = await tx.wait();

        await expectAssertionError(
          expect(Promise.resolve(receipt)).to.be.reverted,
          "Expected transaction to be reverted"
        );
        await expect(Promise.resolve(receipt)).to.not.be.reverted;
      });

      it("promise of a TxReceipt of a reverted transaction", async function () {
        const tx = await mineRevertedTransaction(this.hre);
        const receipt = await this.hre.ethers.provider.waitForTransaction(
          tx.hash
        ); // tx.wait rejects, so we use provider.waitForTransaction

        await expect(Promise.resolve(receipt)).to.be.reverted;
        await expectAssertionError(
          expect(Promise.resolve(receipt)).to.not.be.reverted,
          "Expected transaction NOT to be reverted"
        );
      });
    });

    describe("calling a contract method that succeeds", function () {
      it("a write method that succeeds", async function () {
        await expectAssertionError(
          expect(matchers.succeeds()).to.be.reverted,
          "Expected transaction to be reverted"
        );
        await expect(matchers.succeeds()).to.not.be.reverted;
      });

      it("a view method that succeeds", async function () {
        await expectAssertionError(
          expect(matchers.succeedsView()).to.be.reverted,
          "Expected transaction to be reverted"
        );
        await expect(matchers.succeedsView()).to.not.be.reverted;
      });

      it("a gas estimation that succeeds", async function () {
        await expectAssertionError(
          expect(matchers.estimateGas.succeeds()).to.be.reverted,
          "Expected transaction to be reverted"
        );
        await expect(matchers.estimateGas.succeeds()).to.not.be.reverted;
      });

      it("a static call of a write method that succeeds", async function () {
        await expectAssertionError(
          expect(matchers.callStatic.succeeds()).to.be.reverted,
          "Expected transaction to be reverted"
        );
        await expect(matchers.callStatic.succeeds()).to.not.be.reverted;
      });
    });

    describe("calling a contract method that reverts", function () {
      it("a write method that reverts", async function () {
        await expect(matchers.revertsWithoutReasonString()).to.be.reverted;
        await expectAssertionError(
          expect(matchers.revertsWithoutReasonString()).to.not.be.reverted,
          "Expected transaction NOT to be reverted"
        );
      });

      it("a view method that reverts", async function () {
        await expect(matchers.revertsWithoutReasonStringView()).to.be.reverted;
        await expectAssertionError(
          expect(matchers.revertsWithoutReasonStringView()).to.not.be.reverted,
          "Expected transaction NOT to be reverted"
        );
      });

      it("a gas estimation that reverts", async function () {
        await expect(matchers.estimateGas.revertsWithoutReasonString()).to.be
          .reverted;
        await expectAssertionError(
          expect(matchers.estimateGas.revertsWithoutReasonString()).to.not.be
            .reverted,
          "Expected transaction NOT to be reverted"
        );
      });

      it("a static call of a write method that reverts", async function () {
        await expect(matchers.callStatic.revertsWithoutReasonString()).to.be
          .reverted;
        await expectAssertionError(
          expect(matchers.callStatic.revertsWithoutReasonString()).to.not.be
            .reverted,
          "Expected transaction NOT to be reverted"
        );
      });
    });

    describe("invalid rejection values", function () {
      it("non-errors", async function () {
        await expectAssertionError(
          expect(Promise.reject({})).to.be.reverted,
          "Expected an Error object"
        );
      });
    });
  }
});
