import { AssertionError, expect } from "chai";
import { useEnvironment, useEnvironmentWithNode } from "./helpers";

import "../src";

describe("INTEGRATION: Reverted with", function () {
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
          expect(matchers.succeeds()).to.be.revertedWith("some reason"),
          "Expected transaction to be reverted with reason 'some reason', but it didn't revert"
        );
        await expect(matchers.succeeds()).to.not.be.revertedWith("some reason");
      });

      it("a view method that succeeds", async function () {
        await expectAssertionError(
          expect(matchers.succeedsView()).to.be.revertedWith("some reason"),
          "Expected transaction to be reverted with reason 'some reason', but it didn't revert"
        );
        await expect(matchers.succeedsView()).to.not.be.revertedWith(
          "some reason"
        );
      });

      it("a gas estimation that succeeds", async function () {
        await expectAssertionError(
          expect(matchers.estimateGas.succeeds()).to.be.revertedWith(
            "some reason"
          ),
          "Expected transaction to be reverted with reason 'some reason', but it didn't revert"
        );
        await expect(matchers.estimateGas.succeeds()).to.not.be.revertedWith(
          "some reason"
        );
      });

      it("a static call of a write method that succeeds", async function () {
        await expectAssertionError(
          expect(matchers.callStatic.succeeds()).to.be.revertedWith(
            "some reason"
          ),
          "Expected transaction to be reverted with reason 'some reason', but it didn't revert"
        );
        await expect(matchers.callStatic.succeeds()).to.not.be.revertedWith(
          "some reason"
        );
      });
    });

    describe("calling a contract method that reverts", function () {
      it("a write method that reverts", async function () {
        await expect(matchers.revertsWith("some reason")).to.be.revertedWith(
          "some reason"
        );
        await expect(
          matchers.revertsWith("some reason")
        ).to.not.be.revertedWith("another reason");

        await expectAssertionError(
          expect(matchers.revertsWith("another reason")).to.be.revertedWith(
            "some reason"
          ),
          "Expected transaction to be reverted with reason 'some reason', but it reverted with reason 'another reason'"
        );
        await expectAssertionError(
          expect(matchers.revertsWith("some reason")).to.not.be.revertedWith(
            "some reason"
          ),
          "Expected transaction NOT to be reverted with reason 'some reason', but it did"
        );
      });

      it("a view method that reverts", async function () {
        await expect(
          matchers.revertsWithView("some reason")
        ).to.be.revertedWith("some reason");
        await expect(
          matchers.revertsWithView("some reason")
        ).to.not.be.revertedWith("another reason");

        await expectAssertionError(
          expect(matchers.revertsWithView("another reason")).to.be.revertedWith(
            "some reason"
          ),
          "Expected transaction to be reverted with reason 'some reason', but it reverted with reason 'another reason'"
        );
        await expectAssertionError(
          expect(
            matchers.revertsWithView("some reason")
          ).to.not.be.revertedWith("some reason"),
          "Expected transaction NOT to be reverted with reason 'some reason', but it did"
        );
      });

      it("a gas estimation that reverts", async function () {
        await expect(
          matchers.estimateGas.revertsWith("some reason")
        ).to.be.revertedWith("some reason");
        await expect(
          matchers.estimateGas.revertsWith("some reason")
        ).to.not.be.revertedWith("another reason");

        await expectAssertionError(
          expect(
            matchers.estimateGas.revertsWith("another reason")
          ).to.be.revertedWith("some reason"),
          "Expected transaction to be reverted with reason 'some reason', but it reverted with reason 'another reason'"
        );
        await expectAssertionError(
          expect(
            matchers.estimateGas.revertsWith("some reason")
          ).to.not.be.revertedWith("some reason"),
          "Expected transaction NOT to be reverted with reason 'some reason', but it did"
        );
      });

      it("a static call of a write method that reverts", async function () {
        await expect(
          matchers.callStatic.revertsWith("some reason")
        ).to.be.revertedWith("some reason");
        await expect(
          matchers.callStatic.revertsWith("some reason")
        ).to.not.be.revertedWith("another reason");

        await expectAssertionError(
          expect(
            matchers.callStatic.revertsWith("another reason")
          ).to.be.revertedWith("some reason"),
          "Expected transaction to be reverted with reason 'some reason', but it reverted with reason 'another reason'"
        );
        await expectAssertionError(
          expect(
            matchers.callStatic.revertsWith("some reason")
          ).to.not.be.revertedWith("some reason"),
          "Expected transaction NOT to be reverted with reason 'some reason', but it did"
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

        await expectAssertionError(
          expect(hash).to.be.revertedWith(10 as any),
          "Expected a string as the expected reason string"
        );
      });
    });
  }
});
