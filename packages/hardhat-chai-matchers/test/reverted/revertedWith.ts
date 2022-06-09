import { AssertionError, expect } from "chai";
import { ProviderError } from "hardhat/internal/core/providers/errors";

import {
  runSuccessfulAsserts,
  runFailedAsserts,
  useEnvironment,
  useEnvironmentWithNode,
} from "../helpers";

import "../../src/internal/add-chai-matchers";

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
            expect(x).not.to.be.revertedWith("some reason"),
        });
      });

      it("failed asserts", async function () {
        await runFailedAsserts({
          matchers,
          method: "succeeds",
          failedAssert: (x) => expect(x).to.be.revertedWith("some reason"),
          failedAssertReason:
            "Expected transaction to be reverted with reason 'some reason', but it didn't revert",
        });
      });
    });

    describe("calling a method that reverts without a reason", function () {
      it("successful asserts", async function () {
        await runSuccessfulAsserts({
          matchers,
          method: "revertsWithoutReason",
          successfulAssert: (x) =>
            expect(x).to.not.be.revertedWith("some reason"),
        });
      });

      // depends on a bug being fixed on ethers.js
      // see https://linear.app/nomic-foundation/issue/HH-725
      it.skip("failed asserts", async function () {
        await runFailedAsserts({
          matchers,
          method: "revertsWithoutReason",
          failedAssert: (x) => expect(x).to.be.revertedWith("some reason"),
          failedAssertReason:
            "Expected transaction to be reverted with reason 'some reason', but it reverted without a reason",
        });
      });
    });

    describe("calling a method that reverts with a reason string", function () {
      it("successful asserts", async function () {
        await runSuccessfulAsserts({
          matchers,
          method: "revertsWith",
          args: ["some reason"],
          successfulAssert: (x) => expect(x).to.be.revertedWith("some reason"),
        });

        await runSuccessfulAsserts({
          matchers,
          method: "revertsWith",
          args: ["some reason"],
          successfulAssert: (x) =>
            expect(x).to.not.be.revertedWith("another reason"),
        });
      });

      it("failed asserts: expected reason not to match", async function () {
        await runFailedAsserts({
          matchers,
          method: "revertsWith",
          args: ["some reason"],
          failedAssert: (x) => expect(x).to.not.be.revertedWith("some reason"),
          failedAssertReason:
            "Expected transaction NOT to be reverted with reason 'some reason', but it was",
        });
      });

      it("failed asserts: expected a different reason", async function () {
        await runFailedAsserts({
          matchers,
          method: "revertsWith",
          args: ["another reason"],
          failedAssert: (x) => expect(x).to.be.revertedWith("some reason"),
          failedAssertReason:
            "Expected transaction to be reverted with reason 'some reason', but it reverted with reason 'another reason'",
        });
      });
    });

    describe("calling a method that reverts with a panic code", function () {
      it("successful asserts", async function () {
        await runSuccessfulAsserts({
          matchers,
          method: "panicAssert",
          successfulAssert: (x) =>
            expect(x).to.not.be.revertedWith("some reason"),
        });
      });

      it("failed asserts", async function () {
        await runFailedAsserts({
          matchers,
          method: "panicAssert",
          failedAssert: (x) => expect(x).to.be.revertedWith("some reason"),
          failedAssertReason:
            "Expected transaction to be reverted with reason 'some reason', but it reverted with panic code 0x01 (Assertion error)",
        });
      });
    });

    describe("calling a method that reverts with a custom error", function () {
      it("successful asserts", async function () {
        await runSuccessfulAsserts({
          matchers,
          method: "revertWithSomeCustomError",
          successfulAssert: (x) =>
            expect(x).to.not.be.revertedWith("some reason"),
        });
      });

      it("failed asserts", async function () {
        await runFailedAsserts({
          matchers,
          method: "revertWithSomeCustomError",
          failedAssert: (x) => expect(x).to.be.revertedWith("some reason"),
          failedAssertReason:
            "Expected transaction to be reverted with reason 'some reason', but it reverted with a custom error",
        });
      });
    });

    describe("invalid values", function () {
      it("non-errors as subject", async function () {
        await expect(
          expect(Promise.reject({})).to.be.revertedWith("some reason")
        ).to.be.rejectedWith(AssertionError, "Expected an Error object");
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
          ).to.not.be.revertedWith("some reason")
        ).to.be.eventually.rejectedWith(
          ProviderError,
          "sender doesn't have enough funds to send tx"
        );
      });
    });
  }
});
