import type { Token } from "../../src/internal/matchers/changeTokenBalance.js";
import type { ChangeEtherBalance } from "../helpers/contracts.js";
import type {
  HardhatEthers,
  HardhatEthersSigner,
} from "@nomicfoundation/hardhat-ethers/types";
import type { EthereumProvider } from "hardhat/types/providers";

import path from "node:path";
import { before, beforeEach, describe, it } from "node:test";
import util from "node:util";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import {
  assertThrowsHardhatError,
  useFixtureProjectCopy,
} from "@nomicfoundation/hardhat-test-utils";
import { expect, AssertionError } from "chai";

import { addChaiMatchers } from "../../src/internal/add-chai-matchers.js";
import { initEnvironment } from "../helpers/helpers.js";

addChaiMatchers();

describe("INTEGRATION: changeEtherBalances matcher", { timeout: 60000 }, () => {
  describe("with the in-process hardhat network", () => {
    useFixtureProjectCopy("hardhat-project");
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
      ({ ethers, provider } = await initEnvironment("change-ether-balances"));
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

    describe("Transaction Callback", () => {
      describe("Change balances, one account, one contract", () => {
        it("should pass when all expected balance changes are equal to actual values", async () => {
          await expect(() =>
            sender.sendTransaction({
              to: contract,
              value: 200,
            }),
          ).to.changeEtherBalances(provider, [sender, contract], [-200, 200]);
        });
      });

      describe("Change balances, contract forwards ether sent", () => {
        it("should pass when contract function forwards all tx ether", async () => {
          await expect(() =>
            contract.transferTo(receiver.address, { value: 200 }),
          ).to.changeEtherBalances(
            provider,
            [sender, contract, receiver],
            [-200, 0, 200],
          );
        });
      });

      describe("Change balance, multiple accounts", () => {
        it("should pass when all expected balance changes are equal to actual values", async () => {
          await expect(() =>
            sender.sendTransaction({
              to: receiver.address,
              gasPrice: 1,
              value: 200,
            }),
          ).to.changeEtherBalances(provider, [sender, receiver], ["-200", 200]);
        });

        it("should pass when given addresses as strings", async () => {
          await expect(() =>
            sender.sendTransaction({
              to: receiver.address,
              gasPrice: 1,
              value: 200,
            }),
          ).to.changeEtherBalances(
            provider,
            [sender.address, receiver.address],
            ["-200", 200],
          );
        });

        it("should pass when given native BigInt", async () => {
          await expect(() =>
            sender.sendTransaction({
              to: receiver.address,
              gasPrice: 1,
              value: 200,
            }),
          ).to.changeEtherBalances(provider, [sender, receiver], [-200n, 200n]);
        });

        it("should pass when given a predicate", async () => {
          await expect(() =>
            sender.sendTransaction({
              to: receiver.address,
              gasPrice: 1,
              value: 200,
            }),
          ).to.changeEtherBalances(
            provider,
            [sender, receiver],
            ([senderDiff, receiverDiff]: bigint[]) =>
              senderDiff === -200n && receiverDiff === 200n,
          );
        });

        it("should fail when the predicate returns false", async () => {
          await expect(
            expect(() =>
              sender.sendTransaction({
                to: receiver.address,
                gasPrice: 1,
                value: 200,
              }),
            ).to.changeEtherBalances(
              provider,
              [sender, receiver],
              ([senderDiff, receiverDiff]: bigint[]) =>
                senderDiff === -201n && receiverDiff === 200n,
            ),
          ).to.be.eventually.rejectedWith(
            AssertionError,
            "Expected the balance changes of the accounts to satisfy the predicate, but they didn't",
          );
        });

        it("should fail when the predicate returns true and the assertion is negated", async () => {
          await expect(
            expect(() =>
              sender.sendTransaction({
                to: receiver.address,
                gasPrice: 1,
                value: 200,
              }),
            ).to.not.changeEtherBalances(
              provider,
              [sender, receiver],
              ([senderDiff, receiverDiff]: bigint[]) =>
                senderDiff === -200n && receiverDiff === 200n,
            ),
          ).to.be.eventually.rejectedWith(
            AssertionError,
            "Expected the balance changes of the accounts to NOT satisfy the predicate, but they did",
          );
        });

        it("should take into account transaction fee (legacy tx)", async () => {
          await expect(() =>
            sender.sendTransaction({
              to: receiver.address,
              gasPrice: 1,
              value: 200,
            }),
          ).to.changeEtherBalances(
            provider,
            [sender, receiver, contract],
            [-(txGasFees + 200), 200, 0],
            { includeFee: true },
          );
        });

        it("should take into account transaction fee (1559 tx)", async () => {
          await expect(() =>
            sender.sendTransaction({
              to: receiver.address,
              maxFeePerGas: 1,
              maxPriorityFeePerGas: 1,
              value: 200,
            }),
          ).to.changeEtherBalances(
            provider,
            [sender, receiver, contract],
            [-(txGasFees + 200), 200, 0],
            { includeFee: true },
          );
        });

        it("should pass when given a single address", async () => {
          await expect(() =>
            sender.sendTransaction({ to: receiver.address, value: 200 }),
          ).to.changeEtherBalances(provider, [sender], [-200]);
        });

        it("should pass when negated and numbers don't match", async () => {
          await expect(() =>
            sender.sendTransaction({
              to: receiver.address,
              gasPrice: 1,
              value: 200,
            }),
          ).to.not.changeEtherBalances(
            provider,
            [sender, receiver],
            [-(txGasFees + 201), 200],
          );
          await expect(() =>
            sender.sendTransaction({
              to: receiver.address,
              value: 200,
            }),
          ).to.not.changeEtherBalances(
            provider,
            [sender, receiver],
            [-200, 201],
            {
              includeFee: true,
            },
          );
        });

        it("should throw when expected balance change value was different from an actual for any wallet", async () => {
          await expect(
            expect(() =>
              sender.sendTransaction({
                to: receiver.address,
                gasPrice: 1,
                value: 200,
              }),
            ).to.changeEtherBalances(provider, [sender, receiver], [-200, 201]),
          ).to.be.eventually.rejectedWith(
            AssertionError,
            `Expected the ether balance of ${receiver.address} (the 2nd address in the list) to change by 201 wei, but it changed by 200 wei`,
          );
          await expect(
            expect(() =>
              sender.sendTransaction({
                to: receiver.address,
                gasPrice: 1,
                value: 200,
              }),
            ).to.changeEtherBalances(provider, [sender, receiver], [-201, 200]),
          ).to.be.eventually.rejectedWith(
            AssertionError,
            `Expected the ether balance of ${sender.address} (the 1st address in the list) to change by -201 wei, but it changed by -200 wei`,
          );
        });

        it("should throw in negative case when expected balance changes value were equal to an actual", async () => {
          await expect(
            expect(() =>
              sender.sendTransaction({
                to: receiver.address,
                gasPrice: 1,
                value: 200,
              }),
            ).to.not.changeEtherBalances(
              provider,
              [sender, receiver],
              [-200, 200],
            ),
          ).to.be.eventually.rejectedWith(
            AssertionError,
            `Expected the ether balance of ${sender.address} (the 1st address in the list) NOT to change by -200 wei`,
          );
        });

        it("arrays have different length", async () => {
          expect(() =>
            expect(
              sender.sendTransaction({
                to: receiver.address,
                gasPrice: 1,
                value: 200,
              }),
            ).to.changeEtherBalances(provider, [sender], ["-200", 200]),
          ).to.throw(
            Error,
            "The number of accounts (1) is different than the number of expected balance changes (2)",
          );
          expect(() =>
            expect(
              sender.sendTransaction({
                to: receiver.address,
                gasPrice: 1,
                value: 200,
              }),
            ).to.changeEtherBalances(provider, [sender, receiver], ["-200"]),
          ).to.throw(
            Error,
            "The number of accounts (2) is different than the number of expected balance changes (1)",
          );
        });
      });

      it("shouldn't run the transaction twice", async () => {
        const receiverBalanceBefore =
          await ethers.provider.getBalance(receiver);

        await expect(() =>
          sender.sendTransaction({
            to: receiver.address,
            gasPrice: 1,
            value: 200,
          }),
        ).to.changeEtherBalances(provider, [sender, receiver], [-200, 200]);

        const receiverBalanceAfter = await ethers.provider.getBalance(receiver);
        const receiverBalanceChange =
          receiverBalanceAfter - receiverBalanceBefore;

        expect(receiverBalanceChange).to.equal(200n);
      });
    });

    describe("Transaction Response", () => {
      describe("Change balances, one account, one contract", () => {
        it("should pass when all expected balance changes are equal to actual values", async () => {
          await expect(
            await sender.sendTransaction({
              to: contract,
              value: 200,
            }),
          ).to.changeEtherBalances(provider, [sender, contract], [-200, 200]);
        });
      });

      it("should throw if chained to another non-chainable method", () => {
        assertThrowsHardhatError(
          () =>
            expect(
              sender.sendTransaction({
                to: contract,
                value: 200,
              }),
            )
              .to.changeTokenBalances(
                provider,
                mockToken,
                [sender, receiver],
                [0, 0],
              )
              .and.to.changeEtherBalances(
                provider,
                [sender, contract],
                [-200, 200],
              ),
          HardhatError.ERRORS.CHAI_MATCHERS.MATCHER_CANNOT_BE_CHAINED_AFTER,
          {
            matcher: "changeEtherBalances",
            previousMatcher: "changeTokenBalances",
          },
        );
      });

      describe("Change balance, multiple accounts", () => {
        it("should pass when all expected balance changes are equal to actual values", async () => {
          await expect(
            await sender.sendTransaction({
              to: receiver.address,
              gasPrice: 1,
              value: 200,
            }),
          ).to.changeEtherBalances(
            provider,
            [sender, receiver],
            [(-(txGasFees + 200)).toString(), 200],
            { includeFee: true },
          );
        });

        it("should take into account transaction fee", async () => {
          await expect(
            await sender.sendTransaction({
              to: receiver.address,
              gasPrice: 1,
              value: 200,
            }),
          ).to.changeEtherBalances(
            provider,
            [sender, receiver, contract],
            [-(txGasFees + 200), 200, 0],
            { includeFee: true },
          );
        });

        it("should pass when negated and numbers don't match", async () => {
          await expect(
            await sender.sendTransaction({
              to: receiver.address,
              value: 200,
            }),
          ).to.not.changeEtherBalances(
            provider,
            [sender, receiver],
            [-201, 200],
          );
          await expect(
            await sender.sendTransaction({
              to: receiver.address,
              value: 200,
            }),
          ).to.not.changeEtherBalances(
            provider,
            [sender, receiver],
            [-200, 201],
          );
        });

        it("should throw when fee was not calculated correctly", async () => {
          await expect(
            expect(
              await sender.sendTransaction({
                to: receiver.address,
                gasPrice: 1,
                value: 200,
              }),
            ).to.changeEtherBalances(
              provider,
              [sender, receiver],
              [-200, 200],
              {
                includeFee: true,
              },
            ),
          ).to.be.eventually.rejectedWith(
            AssertionError,
            `Expected the ether balance of ${
              sender.address
            } (the 1st address in the list) to change by -200 wei, but it changed by -${
              txGasFees + 200
            } wei`,
          );
        });

        it("should throw when expected balance change value was different from an actual for any wallet", async () => {
          await expect(
            expect(
              await sender.sendTransaction({
                to: receiver.address,
                value: 200,
              }),
            ).to.changeEtherBalances(provider, [sender, receiver], [-200, 201]),
          ).to.be.eventually.rejectedWith(
            AssertionError,
            `Expected the ether balance of ${receiver.address} (the 2nd address in the list) to change by 201 wei, but it changed by 200 wei`,
          );
          await expect(
            expect(
              await sender.sendTransaction({
                to: receiver.address,
                value: 200,
              }),
            ).to.changeEtherBalances(provider, [sender, receiver], [-201, 200]),
          ).to.be.eventually.rejectedWith(
            AssertionError,
            `Expected the ether balance of ${sender.address} (the 1st address in the list) to change by -201 wei, but it changed by -200 wei`,
          );
        });

        it("should throw in negative case when expected balance changes value were equal to an actual", async () => {
          await expect(
            expect(
              await sender.sendTransaction({
                to: receiver.address,
                value: 200,
              }),
            ).to.not.changeEtherBalances(
              provider,
              [sender, receiver],
              [-200, 200],
            ),
          ).to.be.eventually.rejectedWith(
            AssertionError,
            `Expected the ether balance of ${sender.address} (the 1st address in the list) NOT to change by -200`,
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
          ).to.changeEtherBalances(provider, [sender, receiver], [-100, 100]);
        } catch (e) {
          expect(util.inspect(e)).to.include(
            path.join("test", "matchers", "changeEtherBalances.ts"),
          );
          return;
        }
        expect.fail("Expected an exception but none was thrown");
      });
    });
  }
});
