import type { Token } from "../src/internal/changeTokenBalance";
import type { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import type { ChangeEtherBalance } from "./contracts";

import { expect, AssertionError } from "chai";
import path from "path";
import util from "util";

import "../src/internal/add-chai-matchers";
import { useEnvironment, useEnvironmentWithNode } from "./helpers";

describe("INTEGRATION: changeEtherBalances matcher", function () {
  describe("with the in-process hardhat network", function () {
    useEnvironment("hardhat-project");

    runTests();
  });

  describe("connected to a hardhat node", function () {
    process.env.CHAIN_ID = "12345";
    useEnvironmentWithNode("hardhat-project");

    runTests();
  });

  function runTests() {
    let sender: HardhatEthersSigner;
    let receiver: HardhatEthersSigner;
    let contract: ChangeEtherBalance;
    let txGasFees: number;
    let mockToken: Token;

    beforeEach(async function () {
      const wallets = await this.hre.ethers.getSigners();
      sender = wallets[0];
      receiver = wallets[1];
      contract = await (
        await this.hre.ethers.getContractFactory<[], ChangeEtherBalance>(
          "ChangeEtherBalance"
        )
      ).deploy();
      txGasFees = 1 * 21_000;
      await this.hre.network.provider.send(
        "hardhat_setNextBlockBaseFeePerGas",
        ["0x0"]
      );

      const MockToken = await this.hre.ethers.getContractFactory<[], Token>(
        "MockToken"
      );
      mockToken = await MockToken.deploy();
    });

    describe("Transaction Callback", () => {
      describe("Change balances, one account, one contract", () => {
        it("Should pass when all expected balance changes are equal to actual values", async () => {
          await expect(() =>
            sender.sendTransaction({
              to: contract,
              value: 200,
            })
          ).to.changeEtherBalances([sender, contract], [-200, 200]);
        });
      });

      describe("Change balances, contract forwards ether sent", () => {
        it("Should pass when contract function forwards all tx ether", async () => {
          await expect(() =>
            contract.transferTo(receiver.address, { value: 200 })
          ).to.changeEtherBalances(
            [sender, contract, receiver],
            [-200, 0, 200]
          );
        });
      });

      describe("Change balance, multiple accounts", () => {
        it("Should pass when all expected balance changes are equal to actual values", async () => {
          await expect(() =>
            sender.sendTransaction({
              to: receiver.address,
              gasPrice: 1,
              value: 200,
            })
          ).to.changeEtherBalances([sender, receiver], ["-200", 200]);
        });

        it("Should pass when given addresses as strings", async () => {
          await expect(() =>
            sender.sendTransaction({
              to: receiver.address,
              gasPrice: 1,
              value: 200,
            })
          ).to.changeEtherBalances(
            [sender.address, receiver.address],
            ["-200", 200]
          );
        });

        it("Should pass when given native BigInt", async () => {
          await expect(() =>
            sender.sendTransaction({
              to: receiver.address,
              gasPrice: 1,
              value: 200,
            })
          ).to.changeEtherBalances([sender, receiver], [-200n, 200n]);
        });

        it("Should pass when given a predicate", async () => {
          await expect(() =>
            sender.sendTransaction({
              to: receiver.address,
              gasPrice: 1,
              value: 200,
            })
          ).to.changeEtherBalances(
            [sender, receiver],
            ([senderDiff, receiverDiff]: bigint[]) =>
              senderDiff === -200n && receiverDiff === 200n
          );
        });

        it("Should fail when the predicate returns false", async () => {
          await expect(
            expect(() =>
              sender.sendTransaction({
                to: receiver.address,
                gasPrice: 1,
                value: 200,
              })
            ).to.changeEtherBalances(
              [sender, receiver],
              ([senderDiff, receiverDiff]: bigint[]) =>
                senderDiff === -201n && receiverDiff === 200n
            )
          ).to.be.eventually.rejectedWith(
            AssertionError,
            "Expected the balance changes of the accounts to satisfy the predicate, but they didn't"
          );
        });

        it("Should fail when the predicate returns true and the assertion is negated", async () => {
          await expect(
            expect(() =>
              sender.sendTransaction({
                to: receiver.address,
                gasPrice: 1,
                value: 200,
              })
            ).to.not.changeEtherBalances(
              [sender, receiver],
              ([senderDiff, receiverDiff]: bigint[]) =>
                senderDiff === -200n && receiverDiff === 200n
            )
          ).to.be.eventually.rejectedWith(
            AssertionError,
            "Expected the balance changes of the accounts to NOT satisfy the predicate, but they did"
          );
        });

        it("Should take into account transaction fee (legacy tx)", async () => {
          await expect(() =>
            sender.sendTransaction({
              to: receiver.address,
              gasPrice: 1,
              value: 200,
            })
          ).to.changeEtherBalances(
            [sender, receiver, contract],
            [-(txGasFees + 200), 200, 0],
            { includeFee: true }
          );
        });

        it("Should take into account transaction fee (1559 tx)", async () => {
          await expect(() =>
            sender.sendTransaction({
              to: receiver.address,
              maxFeePerGas: 1,
              maxPriorityFeePerGas: 1,
              value: 200,
            })
          ).to.changeEtherBalances(
            [sender, receiver, contract],
            [-(txGasFees + 200), 200, 0],
            { includeFee: true }
          );
        });

        it("Should pass when given a single address", async () => {
          await expect(() =>
            sender.sendTransaction({ to: receiver.address, value: 200 })
          ).to.changeEtherBalances([sender], [-200]);
        });

        it("Should pass when negated and numbers don't match", async () => {
          await expect(() =>
            sender.sendTransaction({
              to: receiver.address,
              gasPrice: 1,
              value: 200,
            })
          ).to.not.changeEtherBalances(
            [sender, receiver],
            [-(txGasFees + 201), 200]
          );
          await expect(() =>
            sender.sendTransaction({
              to: receiver.address,
              value: 200,
            })
          ).to.not.changeEtherBalances([sender, receiver], [-200, 201], {
            includeFee: true,
          });
        });

        it("Should throw when expected balance change value was different from an actual for any wallet", async () => {
          await expect(
            expect(() =>
              sender.sendTransaction({
                to: receiver.address,
                gasPrice: 1,
                value: 200,
              })
            ).to.changeEtherBalances([sender, receiver], [-200, 201])
          ).to.be.eventually.rejectedWith(
            AssertionError,
            `Expected the ether balance of ${receiver.address} (the 2nd address in the list) to change by 201 wei, but it changed by 200 wei`
          );
          await expect(
            expect(() =>
              sender.sendTransaction({
                to: receiver.address,
                gasPrice: 1,
                value: 200,
              })
            ).to.changeEtherBalances([sender, receiver], [-201, 200])
          ).to.be.eventually.rejectedWith(
            AssertionError,
            `Expected the ether balance of ${sender.address} (the 1st address in the list) to change by -201 wei, but it changed by -200 wei`
          );
        });

        it("Should throw in negative case when expected balance changes value were equal to an actual", async () => {
          await expect(
            expect(() =>
              sender.sendTransaction({
                to: receiver.address,
                gasPrice: 1,
                value: 200,
              })
            ).to.not.changeEtherBalances([sender, receiver], [-200, 200])
          ).to.be.eventually.rejectedWith(
            AssertionError,
            `Expected the ether balance of ${sender.address} (the 1st address in the list) NOT to change by -200 wei`
          );
        });

        it("arrays have different length", async function () {
          expect(() =>
            expect(
              sender.sendTransaction({
                to: receiver.address,
                gasPrice: 1,
                value: 200,
              })
            ).to.changeEtherBalances([sender], ["-200", 200])
          ).to.throw(
            Error,
            "The number of accounts (1) is different than the number of expected balance changes (2)"
          );

          expect(() =>
            expect(
              sender.sendTransaction({
                to: receiver.address,
                gasPrice: 1,
                value: 200,
              })
            ).to.changeEtherBalances([sender, receiver], ["-200"])
          ).to.throw(
            Error,
            "The number of accounts (2) is different than the number of expected balance changes (1)"
          );
        });
      });

      it("shouldn't run the transaction twice", async function () {
        const receiverBalanceBefore = await this.hre.ethers.provider.getBalance(
          receiver
        );

        await expect(() =>
          sender.sendTransaction({
            to: receiver.address,
            gasPrice: 1,
            value: 200,
          })
        ).to.changeEtherBalances([sender, receiver], [-200, 200]);

        const receiverBalanceAfter = await this.hre.ethers.provider.getBalance(
          receiver
        );
        const receiverBalanceChange =
          receiverBalanceAfter - receiverBalanceBefore;

        expect(receiverBalanceChange).to.equal(200n);
      });
    });

    describe("Transaction Response", () => {
      describe("Change balances, one account, one contract", () => {
        it("Should pass when all expected balance changes are equal to actual values", async () => {
          await expect(
            await sender.sendTransaction({
              to: contract,
              value: 200,
            })
          ).to.changeEtherBalances([sender, contract], [-200, 200]);
        });
      });

      it("Should throw if chained to another non-chainable method", () => {
        expect(() =>
          expect(
            sender.sendTransaction({
              to: contract,
              value: 200,
            })
          )
            .to.changeTokenBalances(mockToken, [sender, receiver], [-50, 100])
            .and.to.changeEtherBalances([sender, contract], [-200, 200])
        ).to.throw(
          /The matcher 'changeEtherBalances' cannot be chained after 'changeTokenBalances'./
        );
      });

      describe("Change balance, multiple accounts", () => {
        it("Should pass when all expected balance changes are equal to actual values", async () => {
          await expect(
            await sender.sendTransaction({
              to: receiver.address,
              gasPrice: 1,
              value: 200,
            })
          ).to.changeEtherBalances(
            [sender, receiver],
            [(-(txGasFees + 200)).toString(), 200],
            { includeFee: true }
          );
        });

        it("Should take into account transaction fee", async () => {
          await expect(
            await sender.sendTransaction({
              to: receiver.address,
              gasPrice: 1,
              value: 200,
            })
          ).to.changeEtherBalances(
            [sender, receiver, contract],
            [-(txGasFees + 200), 200, 0],
            { includeFee: true }
          );
        });

        it("Should pass when negated and numbers don't match", async () => {
          await expect(
            await sender.sendTransaction({
              to: receiver.address,
              value: 200,
            })
          ).to.not.changeEtherBalances([sender, receiver], [-201, 200]);

          await expect(
            await sender.sendTransaction({
              to: receiver.address,
              value: 200,
            })
          ).to.not.changeEtherBalances([sender, receiver], [-200, 201]);
        });

        it("Should throw when fee was not calculated correctly", async () => {
          await expect(
            expect(
              await sender.sendTransaction({
                to: receiver.address,
                gasPrice: 1,
                value: 200,
              })
            ).to.changeEtherBalances([sender, receiver], [-200, 200], {
              includeFee: true,
            })
          ).to.be.eventually.rejectedWith(
            AssertionError,
            `Expected the ether balance of ${
              sender.address
            } (the 1st address in the list) to change by -200 wei, but it changed by -${
              txGasFees + 200
            } wei`
          );
        });

        it("Should throw when expected balance change value was different from an actual for any wallet", async () => {
          await expect(
            expect(
              await sender.sendTransaction({
                to: receiver.address,
                value: 200,
              })
            ).to.changeEtherBalances([sender, receiver], [-200, 201])
          ).to.be.eventually.rejectedWith(
            AssertionError,
            `Expected the ether balance of ${receiver.address} (the 2nd address in the list) to change by 201 wei, but it changed by 200 wei`
          );

          await expect(
            expect(
              await sender.sendTransaction({
                to: receiver.address,
                value: 200,
              })
            ).to.changeEtherBalances([sender, receiver], [-201, 200])
          ).to.be.eventually.rejectedWith(
            AssertionError,
            `Expected the ether balance of ${sender.address} (the 1st address in the list) to change by -201 wei, but it changed by -200 wei`
          );
        });

        it("Should throw in negative case when expected balance changes value were equal to an actual", async () => {
          await expect(
            expect(
              await sender.sendTransaction({
                to: receiver.address,
                value: 200,
              })
            ).to.not.changeEtherBalances([sender, receiver], [-200, 200])
          ).to.be.eventually.rejectedWith(
            AssertionError,
            `Expected the ether balance of ${sender.address} (the 1st address in the list) NOT to change by -200`
          );
        });
      });
    });

    describe("stack traces", function () {
      // smoke test for stack traces
      it("includes test file", async function () {
        try {
          await expect(() =>
            sender.sendTransaction({
              to: receiver.address,
              value: 200,
            })
          ).to.changeEtherBalances([sender, receiver], [-100, 100]);
        } catch (e: any) {
          expect(util.inspect(e)).to.include(
            path.join("test", "changeEtherBalances.ts")
          );

          return;
        }

        expect.fail("Expected an exception but none was thrown");
      });
    });
  }
});
