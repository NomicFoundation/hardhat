import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect, AssertionError } from "chai";
import { BigNumber, Contract } from "ethers";

import { useEnvironment, useEnvironmentWithNode } from "./helpers";

describe("INTEGRATION: changeEtherBalances matcher", function () {
  describe("with the in-process hardhat network", function () {
    useEnvironment("hardhat-project");

    runTests();
  });

  describe("connected to a hardhat node", function () {
    useEnvironmentWithNode("hardhat-project");

    runTests();
  });

  function runTests() {
    let sender: SignerWithAddress;
    let receiver: SignerWithAddress;
    let contract: Contract;
    let txGasFees: number;

    beforeEach(async function () {
      const wallets = await this.hre.ethers.getSigners();
      sender = wallets[0];
      receiver = wallets[1];
      contract = await (
        await this.hre.ethers.getContractFactory("ChangeEtherBalance")
      ).deploy();
      txGasFees = 1 * 21_000;
      await this.hre.network.provider.send(
        "hardhat_setNextBlockBaseFeePerGas",
        ["0x0"]
      );
    });

    describe("Transaction Callback", () => {
      describe("Change balances, one account, one contract", () => {
        it("Should pass when all expected balance changes are equal to actual values", async () => {
          await expect(() =>
            sender.sendTransaction({
              to: contract.address,
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
          ).to.changeEtherBalances(
            [sender, receiver],
            [BigInt("-200"), BigInt(200)]
          );
        });

        it("Should pass when given ethers BigNumber", async () => {
          await expect(() =>
            sender.sendTransaction({
              to: receiver.address,
              gasPrice: 1,
              value: 200,
            })
          ).to.changeEtherBalances(
            [sender, receiver],
            [BigNumber.from("-200"), BigNumber.from(200)]
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
            `Expected ${receiver.address} (address #1 in the list) to change balance by 201 wei, but it has changed by 200 wei`
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
            `Expected ${sender.address} (address #0 in the list) to change balance by -201 wei, but it has changed by -200 wei`
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
            `Expected ${sender.address} (address #0 in the list) not to change balance by -200 wei`
          );
        });
      });
    });

    describe("Transaction Response", () => {
      describe("Change balances, one account, one contract", () => {
        it("Should pass when all expected balance changes are equal to actual values", async () => {
          await expect(
            await sender.sendTransaction({
              to: contract.address,
              value: 200,
            })
          ).to.changeEtherBalances([sender, contract], [-200, 200]);
        });
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
            `Expected ${
              sender.address
            } (address #0 in the list) to change balance by -200 wei, but it has changed by -${
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
            `Expected ${receiver.address} (address #1 in the list) to change balance by 201 wei, but it has changed by 200 wei`
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
            `Expected ${sender.address} (address #0 in the list) to change balance by -201 wei, but it has changed by -200 wei`
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
            `Expected ${sender.address} (address #0 in the list) not to change balance by -200`
          );
        });
      });
    });
  }
});
