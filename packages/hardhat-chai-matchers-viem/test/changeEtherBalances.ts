import type { WalletClient } from "@nomicfoundation/hardhat-viem/types";
import type { ChangeEtherBalance, Token } from "./contracts";

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
    let sender: WalletClient;
    let receiver: WalletClient;
    let contract: ChangeEtherBalance;
    let txGasFees: number;
    let mockToken: Token;

    beforeEach(async function () {
      [sender, receiver] = await this.hre.viem.getWalletClients();
      contract = await this.hre.viem.deployContract("ChangeEtherBalance");
      txGasFees = 1 * 21_000;
      await this.hre.network.provider.send(
        "hardhat_setNextBlockBaseFeePerGas",
        ["0x0"]
      );

      mockToken = await this.hre.viem.deployContract("MockToken");
    });

    describe("Transaction Callback", () => {
      describe("Change balances, one account, one contract", () => {
        it("Should pass when all expected balance changes are equal to actual values", async () => {
          await expect(() =>
            sender.sendTransaction({
              to: contract.address,
              value: 200n,
            })
          ).to.changeEtherBalances([sender, contract], [-200, 200]);
        });
      });

      describe("Change balances, contract forwards ether sent", () => {
        it("Should pass when contract function forwards all tx ether", async () => {
          await expect(() =>
            contract.write.transferTo([receiver.account.address], {
              value: 200n,
            })
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
              to: receiver.account.address,
              gasPrice: 1n,
              value: 200n,
            })
          ).to.changeEtherBalances([sender, receiver], ["-200", 200]);
        });

        it("Should pass when given addresses as strings", async () => {
          await expect(() =>
            sender.sendTransaction({
              to: receiver.account.address,
              gasPrice: 1n,
              value: 200n,
            })
          ).to.changeEtherBalances(
            [sender.account.address, receiver.account.address],
            ["-200", 200]
          );
        });

        it("Should pass when given native BigInt", async () => {
          await expect(() =>
            sender.sendTransaction({
              to: receiver.account.address,
              gasPrice: 1n,
              value: 200n,
            })
          ).to.changeEtherBalances(
            [sender, receiver],
            [BigInt("-200"), BigInt(200)]
          );
        });

        it("Should take into account transaction fee (legacy tx)", async () => {
          await expect(() =>
            sender.sendTransaction({
              to: receiver.account.address,
              gasPrice: 1n,
              value: 200n,
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
              to: receiver.account.address,
              maxFeePerGas: 1n,
              maxPriorityFeePerGas: 1n,
              value: 200n,
            })
          ).to.changeEtherBalances(
            [sender, receiver, contract],
            [-(txGasFees + 200), 200, 0],
            { includeFee: true }
          );
        });

        it("Should pass when given a single address", async () => {
          await expect(() =>
            sender.sendTransaction({
              to: receiver.account.address,
              value: 200n,
            })
          ).to.changeEtherBalances([sender], [-200]);
        });

        it("Should pass when negated and numbers don't match", async () => {
          await expect(() =>
            sender.sendTransaction({
              to: receiver.account.address,
              gasPrice: 1n,
              value: 200n,
            })
          ).to.not.changeEtherBalances(
            [sender, receiver],
            [-(txGasFees + 201), 200]
          );
          await expect(() =>
            sender.sendTransaction({
              to: receiver.account.address,
              value: 200n,
            })
          ).to.not.changeEtherBalances([sender, receiver], [-200, 201], {
            includeFee: true,
          });
        });

        it("Should throw when expected balance change value was different from an actual for any wallet", async () => {
          await expect(
            expect(() =>
              sender.sendTransaction({
                to: receiver.account.address,
                gasPrice: 1n,
                value: 200n,
              })
            ).to.changeEtherBalances([sender, receiver], [-200, 201])
          ).to.be.eventually.rejectedWith(
            AssertionError,
            `Expected the ether balance of ${receiver.account.address} (the 2nd address in the list) to change by 201 wei, but it changed by 200 wei`
          );
          await expect(
            expect(() =>
              sender.sendTransaction({
                to: receiver.account.address,
                gasPrice: 1n,
                value: 200n,
              })
            ).to.changeEtherBalances([sender, receiver], [-201, 200])
          ).to.be.eventually.rejectedWith(
            AssertionError,
            `Expected the ether balance of ${sender.account.address} (the 1st address in the list) to change by -201 wei, but it changed by -200 wei`
          );
        });

        it("Should throw in negative case when expected balance changes value were equal to an actual", async () => {
          await expect(
            expect(() =>
              sender.sendTransaction({
                to: receiver.account.address,
                gasPrice: 1n,
                value: 200n,
              })
            ).to.not.changeEtherBalances([sender, receiver], [-200, 200])
          ).to.be.eventually.rejectedWith(
            AssertionError,
            `Expected the ether balance of ${sender.account.address} (the 1st address in the list) NOT to change by -200 wei`
          );
        });
      });

      it("shouldn't run the transaction twice", async function () {
        const publicClient = await this.hre.viem.getPublicClient();
        const receiverBalanceBefore = await publicClient.getBalance({
          address: receiver.account.address,
        });

        await expect(() =>
          sender.sendTransaction({
            to: receiver.account.address,
            gasPrice: 1n,
            value: 200n,
          })
        ).to.changeEtherBalances([sender, receiver], [-200, 200]);

        const receiverBalanceAfter = await publicClient.getBalance({
          address: receiver.account.address,
        });
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
              to: contract.address,
              value: 200n,
            })
          ).to.changeEtherBalances([sender, contract], [-200, 200]);
        });
      });

      it("Should throw if chained to another non-chainable method", () => {
        expect(() =>
          expect(
            sender.sendTransaction({
              to: contract.address,
              value: 200n,
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
              to: receiver.account.address,
              gasPrice: 1n,
              value: 200n,
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
              to: receiver.account.address,
              gasPrice: 1n,
              value: 200n,
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
              to: receiver.account.address,
              value: 200n,
            })
          ).to.not.changeEtherBalances([sender, receiver], [-201, 200]);

          await expect(
            await sender.sendTransaction({
              to: receiver.account.address,
              value: 200n,
            })
          ).to.not.changeEtherBalances([sender, receiver], [-200, 201]);
        });

        it("Should throw when fee was not calculated correctly", async () => {
          await expect(
            expect(
              await sender.sendTransaction({
                to: receiver.account.address,
                gasPrice: 1n,
                value: 200n,
              })
            ).to.changeEtherBalances([sender, receiver], [-200, 200], {
              includeFee: true,
            })
          ).to.be.eventually.rejectedWith(
            AssertionError,
            `Expected the ether balance of ${
              sender.account.address
            } (the 1st address in the list) to change by -200 wei, but it changed by -${
              txGasFees + 200
            } wei`
          );
        });

        it("Should throw when expected balance change value was different from an actual for any wallet", async () => {
          await expect(
            expect(
              await sender.sendTransaction({
                to: receiver.account.address,
                value: 200n,
              })
            ).to.changeEtherBalances([sender, receiver], [-200, 201])
          ).to.be.eventually.rejectedWith(
            AssertionError,
            `Expected the ether balance of ${receiver.account.address} (the 2nd address in the list) to change by 201 wei, but it changed by 200 wei`
          );

          await expect(
            expect(
              await sender.sendTransaction({
                to: receiver.account.address,
                value: 200n,
              })
            ).to.changeEtherBalances([sender, receiver], [-201, 200])
          ).to.be.eventually.rejectedWith(
            AssertionError,
            `Expected the ether balance of ${sender.account.address} (the 1st address in the list) to change by -201 wei, but it changed by -200 wei`
          );
        });

        it("Should throw in negative case when expected balance changes value were equal to an actual", async () => {
          await expect(
            expect(
              await sender.sendTransaction({
                to: receiver.account.address,
                value: 200n,
              })
            ).to.not.changeEtherBalances([sender, receiver], [-200, 200])
          ).to.be.eventually.rejectedWith(
            AssertionError,
            `Expected the ether balance of ${sender.account.address} (the 1st address in the list) NOT to change by -200`
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
              to: receiver.account.address,
              value: 200n,
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
