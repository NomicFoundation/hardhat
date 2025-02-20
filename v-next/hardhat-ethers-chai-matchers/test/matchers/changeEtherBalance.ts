import type { Token } from "../../src/internal/matchers/changeTokenBalance.js";
import type { ChangeEtherBalance } from "../helpers/contracts.js";
import type { EthereumProvider } from "hardhat/types/providers";
import type {
  HardhatEthers,
  HardhatEthersSigner,
} from "@nomicfoundation/hardhat-ethers/types";

import path from "node:path";
import { before, beforeEach, describe, it } from "node:test";
import util from "node:util";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import {
  assertThrowsHardhatError,
  useFixtureProject,
} from "@nomicfoundation/hardhat-test-utils";
import { expect, AssertionError } from "chai";

import { addChaiMatchers } from "../../src/internal/add-chai-matchers.js";
import { initEnvironment } from "../helpers/helpers.js";

addChaiMatchers();

describe("INTEGRATION: changeEtherBalance matcher", { timeout: 60000 }, () => {
  describe("with the in-process hardhat network", () => {
    useFixtureProject("hardhat-project");
    runTests();
  });

  function runTests() {
    let sender: HardhatEthersSigner;
    let receiver: HardhatEthersSigner;
    let contract: ChangeEtherBalance;
    let txGasFees: number;
    let mockToken: Token;

    let provider: EthereumProvider;
    let ethers: HardhatEthers;

    before(async () => {
      ({ ethers, provider } = await initEnvironment("change-ether-balance"));
    });

    beforeEach(async () => {
      const wallets = await ethers.getSigners();
      sender = wallets[0];
      receiver = wallets[1];

      contract = await (
        await ethers.getContractFactory<[], ChangeEtherBalance>(
          "ChangeEtherBalance",
        )
      ).deploy();

      txGasFees = 1 * 21_000;

      await provider.request({
        method: "hardhat_setNextBlockBaseFeePerGas",
        params: ["0x0"],
      });

      const MockToken = await ethers.getContractFactory<[], Token>("MockToken");
      mockToken = await MockToken.deploy();
    });

    describe("Transaction Callback (legacy tx)", () => {
      describe("Change balance, one account", () => {
        it("should pass when expected balance change is passed as string and is equal to an actual", async () => {
          await expect(() =>
            sender.sendTransaction({
              to: receiver.address,
              value: 200,
            }),
          ).to.changeEtherBalance(provider, sender, "-200");
        });

        it("should fail when block contains more than one transaction", async () => {
          await provider.request({
            method: "evm_setAutomine",
            params: [false],
          });

          // we set a gas limit to avoid using the whole block gas limit
          await sender.sendTransaction({
            to: receiver.address,
            value: 200,
            gasLimit: 30_000,
          });

          await provider.request({ method: "evm_setAutomine", params: [true] });

          await expect(
            expect(() =>
              sender.sendTransaction({
                to: receiver.address,
                value: 200,
                gasLimit: 30_000,
              }),
            ).to.changeEtherBalance(provider, sender, -200, {
              includeFee: true,
            }),
          ).to.be.eventually.rejectedWith(
            "There should be only 1 transaction in the block",
          );
        });

        it("should pass when given an address as a string", async () => {
          await expect(() =>
            sender.sendTransaction({
              to: receiver.address,
              value: 200,
            }),
          ).to.changeEtherBalance(provider, sender.address, "-200");
        });

        it("should pass when given a native bigint", async () => {
          await expect(() =>
            sender.sendTransaction({
              to: receiver.address,
              value: 200,
            }),
          ).to.changeEtherBalance(provider, sender, -200n);
        });

        it("should pass when given a predicate", async () => {
          await expect(() =>
            sender.sendTransaction({
              to: receiver.address,
              value: 200,
            }),
          ).to.changeEtherBalance(
            provider,
            sender,
            (diff: bigint) => diff === -200n,
          );
        });

        it("should pass when expected balance change is passed as int and is equal to an actual", async () => {
          await expect(() =>
            sender.sendTransaction({
              to: receiver.address,
              value: 200,
            }),
          ).to.changeEtherBalance(provider, receiver, 200);
        });

        it("should take into account transaction fee", async () => {
          await expect(() =>
            sender.sendTransaction({
              to: receiver.address,
              gasPrice: 1,
              value: 200,
            }),
          ).to.changeEtherBalance(provider, sender, -(txGasFees + 200), {
            includeFee: true,
          });
        });

        it("should take into account transaction fee when given a predicate", async () => {
          await expect(() =>
            sender.sendTransaction({
              to: receiver.address,
              gasPrice: 1,
              value: 200,
            }),
          ).to.changeEtherBalance(
            provider,
            sender,
            (diff: bigint) => diff === -(BigInt(txGasFees) + 200n),
            {
              includeFee: true,
            },
          );
        });

        it("should ignore fee if receiver's wallet is being checked and includeFee was set", async () => {
          await expect(() =>
            sender.sendTransaction({
              to: receiver.address,
              gasPrice: 1,
              value: 200,
            }),
          ).to.changeEtherBalance(provider, receiver, 200, {
            includeFee: true,
          });
        });

        it("should take into account transaction fee by default", async () => {
          await expect(() =>
            sender.sendTransaction({
              to: receiver.address,
              gasPrice: 1,
              value: 200,
            }),
          ).to.changeEtherBalance(provider, sender, -200);
        });

        it("should pass on negative case when expected balance does not satisfy the predicate", async () => {
          await expect(() =>
            sender.sendTransaction({
              to: receiver.address,
              value: 200,
            }),
          ).to.not.changeEtherBalance(
            provider,
            receiver,
            (diff: bigint) => diff === 300n,
          );
        });

        it("should throw when fee was not calculated correctly", async () => {
          await expect(
            expect(() =>
              sender.sendTransaction({
                to: receiver.address,
                gasPrice: 1,
                value: 200,
              }),
            ).to.changeEtherBalance(provider, sender, -200, {
              includeFee: true,
            }),
          ).to.be.eventually.rejectedWith(
            AssertionError,
            `Expected the ether balance of "${
              sender.address
            }" to change by -200 wei, but it changed by -${txGasFees + 200} wei`,
          );
        });

        it("should throw when expected balance change value was different from an actual", async () => {
          await expect(
            expect(() =>
              sender.sendTransaction({
                to: receiver.address,
                value: 200,
              }),
            ).to.changeEtherBalance(provider, sender, "-500"),
          ).to.be.eventually.rejectedWith(
            AssertionError,
            `Expected the ether balance of "${sender.address}" to change by -500 wei, but it changed by -200 wei`,
          );
        });

        it("should throw when actual balance change value does not satisfy the predicate", async () => {
          await expect(
            expect(() =>
              sender.sendTransaction({
                to: receiver.address,
                value: 200,
              }),
            ).to.changeEtherBalance(
              provider,
              sender,
              (diff: bigint) => diff === -500n,
            ),
          ).to.be.eventually.rejectedWith(
            AssertionError,
            `Expected the ether balance change of "${sender.address}" to satisfy the predicate, but it didn't (balance change: -200 wei)`,
          );
        });

        it("should throw in negative case when expected balance change value was equal to an actual", async () => {
          await expect(
            expect(() =>
              sender.sendTransaction({
                to: receiver.address,
                value: 200,
              }),
            ).to.not.changeEtherBalance(provider, sender, "-200"),
          ).to.be.eventually.rejectedWith(
            AssertionError,
            `Expected the ether balance of "${sender.address}" NOT to change by -200 wei, but it did`,
          );
        });

        it("should throw in negative case when expected balance change value satisfies the predicate", async () => {
          await expect(
            expect(() =>
              sender.sendTransaction({
                to: receiver.address,
                value: 200,
              }),
            ).to.not.changeEtherBalance(
              provider,
              sender,
              (diff: bigint) => diff === -200n,
            ),
          ).to.be.eventually.rejectedWith(
            AssertionError,
            `Expected the ether balance change of "${sender.address}" to NOT satisfy the predicate, but it did (balance change: -200 wei)`,
          );
        });

        it("should pass when given zero value tx", async () => {
          await expect(() =>
            sender.sendTransaction({ to: receiver.address, value: 0 }),
          ).to.changeEtherBalance(provider, sender, 0);
        });

        it("shouldn't run the transaction twice", async () => {
          const receiverBalanceBefore: bigint =
            await ethers.provider.getBalance(receiver);
          await expect(() =>
            sender.sendTransaction({
              to: receiver.address,
              value: 200,
            }),
          ).to.changeEtherBalance(provider, sender, -200);
          const receiverBalanceAfter: bigint =
            await ethers.provider.getBalance(receiver);
          const receiverBalanceChange =
            receiverBalanceAfter - receiverBalanceBefore;
          expect(receiverBalanceChange).to.equal(200n);
        });
      });

      describe("Change balance, one contract", () => {
        it("should pass when expected balance change is passed as int and is equal to an actual", async () => {
          await expect(async () =>
            sender.sendTransaction({
              to: contract,
              value: 200,
            }),
          ).to.changeEtherBalance(provider, contract, 200);
        });

        it("should pass when calling function that returns half the sent ether", async () => {
          await expect(async () =>
            contract.returnHalf({ value: 200 }),
          ).to.changeEtherBalance(provider, sender, -100);
        });
      });
    });

    describe("Transaction Callback (1559 tx)", () => {
      describe("Change balance, one account", () => {
        it("should pass when expected balance change is passed as string and is equal to an actual", async () => {
          await expect(() =>
            sender.sendTransaction({
              to: receiver.address,
              maxFeePerGas: 2,
              maxPriorityFeePerGas: 1,
              value: 200,
            }),
          ).to.changeEtherBalance(provider, sender, "-200");
        });

        it("should pass when expected balance change is passed as int and is equal to an actual", async () => {
          await expect(() =>
            sender.sendTransaction({
              to: receiver.address,
              maxFeePerGas: 2,
              maxPriorityFeePerGas: 1,
              value: 200,
            }),
          ).to.changeEtherBalance(provider, receiver, 200);
        });

        it("should take into account transaction fee", async () => {
          await expect(() =>
            sender.sendTransaction({
              to: receiver.address,
              maxFeePerGas: 2,
              maxPriorityFeePerGas: 1,
              value: 200,
            }),
          ).to.changeEtherBalance(provider, sender, -(txGasFees + 200), {
            includeFee: true,
          });
        });

        it("should ignore fee if receiver's wallet is being checked and includeFee was set", async () => {
          await expect(() =>
            sender.sendTransaction({
              to: receiver.address,
              maxFeePerGas: 2,
              maxPriorityFeePerGas: 1,
              value: 200,
            }),
          ).to.changeEtherBalance(provider, receiver, 200, {
            includeFee: true,
          });
        });

        it("should take into account transaction fee by default", async () => {
          await expect(() =>
            sender.sendTransaction({
              to: receiver.address,
              maxFeePerGas: 2,
              maxPriorityFeePerGas: 1,
              value: 200,
            }),
          ).to.changeEtherBalance(provider, sender, -200);
        });

        it("should throw when fee was not calculated correctly", async () => {
          await expect(
            expect(() =>
              sender.sendTransaction({
                to: receiver.address,
                maxFeePerGas: 2,
                maxPriorityFeePerGas: 1,
                value: 200,
              }),
            ).to.changeEtherBalance(provider, sender, -200, {
              includeFee: true,
            }),
          ).to.be.eventually.rejectedWith(
            AssertionError,
            `Expected the ether balance of "${
              sender.address
            }" to change by -200 wei, but it changed by -${txGasFees + 200} wei`,
          );
        });

        it("should throw when expected balance change value was different from an actual", async () => {
          await expect(
            expect(() =>
              sender.sendTransaction({
                to: receiver.address,
                maxFeePerGas: 2,
                maxPriorityFeePerGas: 1,
                value: 200,
              }),
            ).to.changeEtherBalance(provider, sender, "-500"),
          ).to.be.eventually.rejectedWith(
            AssertionError,
            `Expected the ether balance of "${sender.address}" to change by -500 wei, but it changed by -200 wei`,
          );
        });

        it("should throw in negative case when expected balance change value was equal to an actual", async () => {
          await expect(
            expect(() =>
              sender.sendTransaction({
                to: receiver.address,
                maxFeePerGas: 2,
                maxPriorityFeePerGas: 1,
                value: 200,
              }),
            ).to.not.changeEtherBalance(provider, sender, "-200"),
          ).to.be.eventually.rejectedWith(
            AssertionError,
            `Expected the ether balance of "${sender.address}" NOT to change by -200 wei, but it did`,
          );
        });
      });

      describe("Change balance, one contract", () => {
        it("should pass when expected balance change is passed as int and is equal to an actual", async () => {
          await expect(async () =>
            sender.sendTransaction({
              to: contract,
              maxFeePerGas: 2,
              maxPriorityFeePerGas: 1,
              value: 200,
            }),
          ).to.changeEtherBalance(provider, contract, 200);
        });

        it("should take into account transaction fee", async () => {
          const tx = {
            to: contract,
            maxFeePerGas: 2,
            maxPriorityFeePerGas: 1,
            value: 200,
          };
          const gas: bigint = await ethers.provider.estimateGas(tx);
          await expect(() => sender.sendTransaction(tx)).to.changeEtherBalance(
            provider,
            sender,
            -(gas + 200n),
            {
              includeFee: true,
            },
          );
        });

        it("should pass when calling function that returns half the sent ether", async () => {
          await expect(async () =>
            contract.returnHalf({
              value: 200,
              maxFeePerGas: 2,
              maxPriorityFeePerGas: 1,
            }),
          ).to.changeEtherBalance(provider, sender, -100);
        });
      });

      it("shouldn't run the transaction twice", async () => {
        const receiverBalanceBefore: bigint =
          await ethers.provider.getBalance(receiver);

        await expect(() =>
          sender.sendTransaction({
            to: receiver.address,
            maxFeePerGas: 2,
            maxPriorityFeePerGas: 1,
            value: 200,
          }),
        ).to.changeEtherBalance(provider, sender, -200);

        const receiverBalanceAfter: bigint =
          await ethers.provider.getBalance(receiver);

        const receiverBalanceChange =
          receiverBalanceAfter - receiverBalanceBefore;

        expect(receiverBalanceChange).to.equal(200n);
      });
    });

    describe("Transaction Response", () => {
      describe("Change balance, one account", () => {
        it("should pass when expected balance change is passed as string and is equal to an actual", async () => {
          await expect(
            await sender.sendTransaction({
              to: receiver.address,
              value: 200,
            }),
          ).to.changeEtherBalance(provider, sender, "-200");
        });

        it("should pass when expected balance change is passed as int and is equal to an actual", async () => {
          await expect(
            await sender.sendTransaction({
              to: receiver.address,
              value: 200,
            }),
          ).to.changeEtherBalance(provider, receiver, 200);
        });

        it("should throw when expected balance change value was different from an actual", async () => {
          await expect(
            expect(
              await sender.sendTransaction({
                to: receiver.address,
                value: 200,
              }),
            ).to.changeEtherBalance(provider, sender, "-500"),
          ).to.be.eventually.rejectedWith(
            AssertionError,
            `Expected the ether balance of "${sender.address}" to change by -500 wei, but it changed by -200 wei`,
          );
        });

        it("should throw in negative case when expected balance change value was equal to an actual", async () => {
          await expect(
            expect(
              await sender.sendTransaction({
                to: receiver.address,
                value: 200,
              }),
            ).to.not.changeEtherBalance(provider, sender, "-200"),
          ).to.be.eventually.rejectedWith(
            AssertionError,
            `Expected the ether balance of "${sender.address}" NOT to change by -200 wei, but it did`,
          );
        });
      });

      describe("Change balance, one contract", () => {
        it("should pass when expected balance change is passed as int and is equal to an actual", async () => {
          await expect(
            await sender.sendTransaction({
              to: contract,
              value: 200,
            }),
          ).to.changeEtherBalance(provider, contract, 200);
        });
      });
    });

    describe("Transaction Promise", () => {
      describe("Change balance, one account", () => {
        it("should pass when expected balance change is passed as string and is equal to an actual", async () => {
          await expect(
            sender.sendTransaction({
              to: receiver.address,
              value: 200,
            }),
          ).to.changeEtherBalance(provider, sender, "-200");
        });

        it("should pass when expected balance change is passed as int and is equal to an actual", async () => {
          await expect(
            sender.sendTransaction({
              to: receiver.address,
              value: 200,
            }),
          ).to.changeEtherBalance(provider, receiver, 200);
        });

        it("should throw when expected balance change value was different from an actual", async () => {
          await expect(
            expect(
              sender.sendTransaction({
                to: receiver.address,
                value: 200,
              }),
            ).to.changeEtherBalance(provider, sender, "-500"),
          ).to.be.eventually.rejectedWith(
            AssertionError,
            `Expected the ether balance of "${sender.address}" to change by -500 wei, but it changed by -200 wei`,
          );
        });

        it("should throw in negative case when expected balance change value was equal to an actual", async () => {
          await expect(
            expect(
              sender.sendTransaction({
                to: receiver.address,
                value: 200,
              }),
            ).to.not.changeEtherBalance(provider, sender, "-200"),
          ).to.be.eventually.rejectedWith(
            AssertionError,
            `Expected the ether balance of "${sender.address}" NOT to change by -200 wei, but it did`,
          );
        });

        it("should throw if chained to another non-chainable method", () => {
          assertThrowsHardhatError(
            () =>
              expect(
                sender.sendTransaction({
                  to: receiver.address,
                  value: 200,
                }),
              )
                .to.changeTokenBalance(provider, mockToken, receiver, 0)
                .and.to.changeEtherBalance(provider, sender, "-200"),
            HardhatError.ERRORS.CHAI_MATCHERS.MATCHER_CANNOT_BE_CHAINED_AFTER,
            {
              matcher: "changeEtherBalance",
              previousMatcher: "changeTokenBalance",
            },
          );
        });
      });
    });

    describe("stack traces", () => {
      // smoke test for stack traces
      it("includes test file", async () => {
        try {
          await expect(() =>
            sender.sendTransaction({
              to: receiver.address,
              value: 200,
            }),
          ).to.changeEtherBalance(provider, sender, -100);
        } catch (e) {
          expect(util.inspect(e)).to.include(
            path.join("test", "matchers", "changeEtherBalance.ts"),
          );
          return;
        }
        expect.fail("Expected an exception but none was thrown");
      });
    });
  }
});
