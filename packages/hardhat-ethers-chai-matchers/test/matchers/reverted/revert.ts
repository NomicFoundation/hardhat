import type { MatchersContract } from "../../helpers/contracts.js";
import type { HardhatEthers } from "@nomicfoundation/hardhat-ethers/types";
import type { EthereumProvider } from "hardhat/types/providers";

import path from "node:path";
import { before, beforeEach, describe, it } from "node:test";
import util from "node:util";

import {
  assertRejects,
  assertThrows,
  useEphemeralFixtureProject,
} from "@nomicfoundation/hardhat-test-utils";
import { AssertionError, expect } from "chai";

import { addChaiMatchers } from "../../../src/internal/add-chai-matchers.js";
import {
  runSuccessfulAsserts,
  runFailedAsserts,
  mineSuccessfulTransaction,
  mineRevertedTransaction,
  initEnvironment,
} from "../../helpers/helpers.js";

import {
  createNoDataCallException,
  createNoDataProviderExecutionError,
  createNoDataProviderExecutionErrorWithEnvelopeData,
  createNestedNoDataProviderExecutionError,
} from "./no-data-error-fixtures.js";

addChaiMatchers();

describe("INTEGRATION: Revert", { timeout: 60000 }, () => {
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
      ({ ethers, provider } = await initEnvironment("reverted"));
    });

    beforeEach(async () => {
      const Matchers = await ethers.getContractFactory<[], MatchersContract>(
        "Matchers",
      );
      matchers = await Matchers.deploy();
    });

    // helpers
    const expectAssertionError = async (x: Promise<void>, message: string) => {
      return await expect(x).to.be.eventually.rejectedWith(
        AssertionError,
        message,
      );
    };

    describe("with a string as its subject", () => {
      it("hash of a successful transaction", async () => {
        const { hash } = await mineSuccessfulTransaction(provider, ethers);

        await expectAssertionError(
          expect(hash).to.be.revert(ethers),
          "Expected transaction to be reverted",
        );
        await expect(hash).to.not.be.revert(ethers);
      });

      it("hash of a reverted transaction", async () => {
        const { hash } = await mineRevertedTransaction(
          provider,
          ethers,
          matchers,
        );

        await expect(hash).to.be.revert(ethers);
        await expectAssertionError(
          expect(hash).to.not.be.revert(ethers),
          "Expected transaction NOT to be reverted",
        );
      });

      it("invalid string", async () => {
        await assertRejects(
          () => expect("0x123").to.be.revert(ethers),
          (e) =>
            e.message.includes(
              'Expected a valid transaction hash, but got "0x123"',
            ),
          "Expected invalid transaction hash error message",
        );

        await assertRejects(
          () => expect("0x123").to.not.be.revert(ethers),
          (e) =>
            e.message.includes(
              'Expected a valid transaction hash, but got "0x123"',
            ),
          "Expected invalid transaction hash error message",
        );
      });

      it("promise of a hash of a successful transaction", async () => {
        const { hash } = await mineSuccessfulTransaction(provider, ethers);
        await expectAssertionError(
          expect(Promise.resolve(hash)).to.be.revert(ethers),
          "Expected transaction to be reverted",
        );
        await expect(Promise.resolve(hash)).to.not.be.revert(ethers);
      });

      it("promise of a hash of a reverted transaction", async () => {
        const { hash } = await mineRevertedTransaction(
          provider,
          ethers,
          matchers,
        );
        await expect(Promise.resolve(hash)).to.be.revert(ethers);
        await expectAssertionError(
          expect(Promise.resolve(hash)).to.not.be.revert(ethers),
          "Expected transaction NOT to be reverted",
        );
      });

      it("promise of an invalid string", async () => {
        await assertRejects(
          () => expect(Promise.resolve("0x123")).to.be.revert(ethers),
          (e) =>
            e.message.includes(
              'Expected a valid transaction hash, but got "0x123"',
            ),
          "Expected invalid transaction hash error message",
        );

        await assertRejects(
          () => expect(Promise.resolve("0x123")).to.not.be.revert(ethers),
          (e) =>
            e.message.includes(
              'Expected a valid transaction hash, but got "0x123"',
            ),
          "Expected invalid transaction hash error message",
        );
      });

      it("promise of an byte32 string", async () => {
        await expect(
          Promise.resolve(
            "0x3230323400000000000000000000000000000000000000000000000000000000",
          ),
        ).not.to.be.revert(ethers);
      });
    });

    describe("with a TxResponse as its subject", () => {
      it("TxResponse of a successful transaction", async () => {
        const tx = await mineSuccessfulTransaction(provider, ethers);

        await expectAssertionError(
          expect(tx).to.be.revert(ethers),
          "Expected transaction to be reverted",
        );
        await expect(tx).to.not.be.revert(ethers);
      });

      it("TxResponse of a reverted transaction", async () => {
        const tx = await mineRevertedTransaction(provider, ethers, matchers);

        await expect(tx).to.be.revert(ethers);
        await expectAssertionError(
          expect(tx).to.not.be.revert(ethers),
          "Expected transaction NOT to be reverted",
        );
      });

      it("promise of a TxResponse of a successful transaction", async () => {
        const txPromise = mineSuccessfulTransaction(provider, ethers);

        await expectAssertionError(
          expect(txPromise).to.be.revert(ethers),
          "Expected transaction to be reverted",
        );
        await expect(txPromise).to.not.be.revert(ethers);
      });

      it("promise of a TxResponse of a reverted transaction", async () => {
        const txPromise = mineRevertedTransaction(provider, ethers, matchers);

        await expect(txPromise).to.be.revert(ethers);
        await expectAssertionError(
          expect(txPromise).to.not.be.revert(ethers),
          "Expected transaction NOT to be reverted",
        );
      });

      it("reverted: should throw if chained to another non-chainable method", () => {
        assertThrows(
          () =>
            expect(matchers.revertsWith("bar"))
              .to.be.revertedWith("bar")
              .and.to.be.revert(ethers),
          (e) =>
            e.message.includes(
              'The matcher "revert" cannot be chained after "revertedWith"',
            ),
          "Expected chaining error message",
        );
      });

      it("revertedWith: should throw if chained to another non-chainable method", () => {
        assertThrows(
          () =>
            expect(matchers.revertWithCustomErrorWithInt(1))
              .to.be.revertedWithCustomError(matchers, "CustomErrorWithInt")
              .and.to.be.revertedWith("an error message"),
          (e) =>
            e.message.includes(
              'The matcher "revertedWith" cannot be chained after "revertedWithCustomError"',
            ),
          "Expected chaining error message",
        );
      });

      it("revertedWithCustomError: should throw if chained to another non-chainable method", () => {
        assertThrows(
          () =>
            expect(matchers.revertsWithoutReason())
              .to.be.revertedWithoutReason(ethers)
              .and.to.be.revertedWithCustomError(matchers, "SomeCustomError"),
          (e) =>
            e.message.includes(
              'The matcher "revertedWithCustomError" cannot be chained after "revertedWithoutReason"',
            ),
          "Expected chaining error message",
        );
      });

      it("revertedWithoutReason: should throw if chained to another non-chainable method", () => {
        assertThrows(
          () =>
            expect(matchers.panicAssert())
              .to.be.revertedWithPanic()
              .and.to.be.revertedWithoutReason(ethers),
          (e) =>
            e.message.includes(
              'The matcher "revertedWithoutReason" cannot be chained after "revertedWithPanic"',
            ),
          "Expected chaining error message",
        );
      });

      it("revertedWithPanic: should throw if chained to another non-chainable method", async () => {
        const [sender, receiver] = await ethers.getSigners();

        assertThrows(
          () =>
            expect(() =>
              sender.sendTransaction({
                to: receiver,
                value: 200,
              }),
            )
              .to.changeEtherBalance(ethers, sender, "-200")
              .and.to.be.revertedWithPanic(),
          (e) =>
            e.message.includes(
              'The matcher "revertedWithPanic" cannot be chained after "changeEtherBalance"',
            ),
          "Expected chaining error message",
        );
      });
    });

    describe("with a TxReceipt as its subject", () => {
      it("TxReceipt of a successful transaction", async () => {
        const tx = await mineSuccessfulTransaction(provider, ethers);
        const receipt = await tx.wait();

        await expectAssertionError(
          expect(receipt).to.be.revert(ethers),
          "Expected transaction to be reverted",
        );
        await expect(receipt).to.not.be.revert(ethers);
      });

      it("TxReceipt of a reverted transaction", async () => {
        const tx = await mineRevertedTransaction(provider, ethers, matchers);
        const receipt = await ethers.provider.getTransactionReceipt(tx.hash); // tx.wait rejects, so we use provider.getTransactionReceipt

        await expect(receipt).to.be.revert(ethers);
        await expectAssertionError(
          expect(receipt).to.not.be.revert(ethers),
          "Expected transaction NOT to be reverted",
        );
      });

      it("promise of a TxReceipt of a successful transaction", async () => {
        const tx = await mineSuccessfulTransaction(provider, ethers);
        const receiptPromise = tx.wait();

        await expectAssertionError(
          expect(receiptPromise).to.be.revert(ethers),
          "Expected transaction to be reverted",
        );
        await expect(receiptPromise).to.not.be.revert(ethers);
      });

      it("promise of a TxReceipt of a reverted transaction", async () => {
        const tx = await mineRevertedTransaction(provider, ethers, matchers);
        const receiptPromise = ethers.provider.getTransactionReceipt(tx.hash); // tx.wait rejects, so we use provider.getTransactionReceipt

        await expect(receiptPromise).to.be.revert(ethers);
        await expectAssertionError(
          expect(receiptPromise).to.not.be.revert(ethers),
          "Expected transaction NOT to be reverted",
        );
      });
    });

    describe("calling a contract method that succeeds", () => {
      it("successful asserts", async () => {
        await runSuccessfulAsserts({
          matchers,
          method: "succeeds",
          args: [],
          successfulAssert: (x) => expect(x).to.not.be.revert(ethers),
        });
      });

      it("failed asserts", async () => {
        await runFailedAsserts({
          matchers,
          method: "succeeds",
          args: [],
          failedAssert: (x) => expect(x).to.be.revert(ethers),
          failedAssertReason: "Expected transaction to be reverted",
        });
      });
    });

    describe("calling a method that reverts without a reason", () => {
      it("successful asserts", async () => {
        await runSuccessfulAsserts({
          matchers,
          method: "revertsWithoutReason",
          args: [],
          successfulAssert: (x) => expect(x).to.be.revert(ethers),
        });
      });

      it("failed asserts", async () => {
        await runFailedAsserts({
          matchers,
          method: "revertsWithoutReason",
          args: [],
          failedAssert: (x) => expect(x).not.to.be.revert(ethers),
          failedAssertReason: "Expected transaction NOT to be reverted",
        });
      });
    });

    describe("calling a method that reverts with a reason string", () => {
      it("successful asserts", async () => {
        await runSuccessfulAsserts({
          matchers,
          method: "revertsWith",
          args: ["some reason"],
          successfulAssert: (x) => expect(x).to.be.revert(ethers),
        });
      });

      it("failed asserts", async () => {
        await runFailedAsserts({
          matchers,
          method: "revertsWith",
          args: ["some reason"],
          failedAssert: (x) => expect(x).not.to.be.revert(ethers),
          failedAssertReason:
            "Expected transaction NOT to be reverted, but it reverted with reason 'some reason'",
        });
      });
    });

    describe("calling a method that reverts with a panic code", () => {
      it("successful asserts", async () => {
        await runSuccessfulAsserts({
          matchers,
          method: "panicAssert",
          args: [],
          successfulAssert: (x) => expect(x).to.be.revert(ethers),
        });
      });

      it("failed asserts", async () => {
        await runFailedAsserts({
          matchers,
          method: "panicAssert",
          args: [],
          failedAssert: (x) => expect(x).not.to.be.revert(ethers),
          failedAssertReason:
            "Expected transaction NOT to be reverted, but it reverted with panic code 0x1 (Assertion error)",
        });
      });
    });

    describe("calling a method that reverts with a custom error", () => {
      it("successful asserts", async () => {
        await runSuccessfulAsserts({
          matchers,
          method: "revertWithSomeCustomError",
          args: [],
          successfulAssert: (x) => expect(x).to.be.revert(ethers),
        });
      });

      it("failed asserts", async () => {
        await runFailedAsserts({
          matchers,
          method: "revertWithSomeCustomError",
          args: [],
          failedAssert: (x) => expect(x).not.to.be.revert(ethers),
          failedAssertReason: "Expected transaction NOT to be reverted",
        });
      });
    });

    describe("invalid rejection values", () => {
      const expectNoDataExecutionError = async (error: Error) => {
        await expect(Promise.reject(error)).to.be.revert(ethers);
      };

      const expectNonRevertError = async (error: Error, message: string) => {
        await expect(
          expect(Promise.reject(error)).to.be.revert(ethers),
        ).to.be.rejectedWith(message);
      };

      it("non-errors", async () => {
        await expectAssertionError(
          expect(Promise.reject({})).to.be.revert(ethers),
          "Expected an Error object",
        );
      });

      it("no-data call exceptions", async () => {
        for (const action of ["call", "estimateGas"] as const) {
          await expectNoDataExecutionError(createNoDataCallException(action));
        }

        await expectNoDataExecutionError(
          createNoDataCallException("call", new Error("execution reverted")),
        );

        await expectAssertionError(
          expect(
            Promise.reject(createNoDataCallException("call")),
          ).not.to.be.revert(ethers),
          "Expected transaction NOT to be reverted",
        );
      });

      it("no-data provider execution errors", async () => {
        for (const code of [-32003, -32000, 3]) {
          await expectNoDataExecutionError(
            createNoDataProviderExecutionError(code),
          );
        }

        await expectNoDataExecutionError(
          createNoDataProviderExecutionError(-32003, "EVM error OutOfGas"),
        );
        await expectNoDataExecutionError(
          createNoDataProviderExecutionErrorWithEnvelopeData(-32003),
        );
        await expectNoDataExecutionError(
          createNestedNoDataProviderExecutionError(-32003),
        );

        await expectNonRevertError(
          new Error("execution reverted"),
          "execution reverted",
        );
        await expectNonRevertError(
          new Error("invalid opcode: INVALID"),
          "invalid opcode: INVALID",
        );
        await expectNonRevertError(
          createNoDataProviderExecutionError(
            -32003,
            "EVM error; database error: failed to get account",
          ),
          "EVM error; database error: failed to get account",
        );
        await expectNonRevertError(
          createNoDataProviderExecutionError(-32003, "EVM error DatabaseError"),
          "EVM error DatabaseError",
        );
      });

      it("no-data execution errors still require return data for reason-specific matchers", async () => {
        const reasonSpecificAssertions = [
          () =>
            expect(
              Promise.reject(createNoDataProviderExecutionError(-32003)),
            ).to.be.revertedWith("some reason"),
          () =>
            expect(
              Promise.reject(createNoDataProviderExecutionError(-32003)),
            ).to.be.revertedWithPanic(),
          () =>
            expect(
              Promise.reject(createNoDataProviderExecutionError(-32003)),
            ).to.be.revertedWithCustomError(matchers, "SomeCustomError"),
          () =>
            expect(
              Promise.reject(createNoDataProviderExecutionError(-32003)),
            ).to.be.revertedWithoutReason(ethers),
        ];

        for (const assertion of reasonSpecificAssertions) {
          await expect(assertion()).to.be.rejectedWith(
            "EVM error InvalidFEOpcode",
          );
        }
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
          ).to.not.be.revert(ethers),
        ).to.be.eventually.rejectedWith(
          /^Sender doesn't have enough funds to send tx\. The max upfront cost is: (\d+) and the sender's balance is: (\d+)\.$/,
        );
      });
    });

    describe("stack traces", () => {
      // smoke test for stack traces
      it("includes test file", async () => {
        try {
          await expect(matchers.succeeds()).to.be.revert(ethers);
        } catch (e) {
          const errorString = util.inspect(e);
          expect(errorString).to.include("Expected transaction to be reverted");
          expect(errorString).to.include(
            path.join("test", "matchers", "reverted", "revert.ts"),
          );
          return;
        }
        expect.fail("Expected an exception but none was thrown");
      });
    });

    describe("When automining is disabled", () => {
      it("should wait for the tx to be mined and detect the revert", async () => {
        await provider.request({
          method: "evm_setAutomine",
          params: [false],
        });

        try {
          const tx = await matchers.revertsWithoutReason({
            gasLimit: 1_000_000,
          });

          const revertPromise = expect(tx).to.be.revert(ethers);

          await provider.request({ method: "hardhat_mine", params: [] });

          await revertPromise;
        } finally {
          await provider.request({
            method: "evm_setAutomine",
            params: [true],
          });
        }
      });
    });
  }
});
