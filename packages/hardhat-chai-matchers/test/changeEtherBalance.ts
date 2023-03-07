import type { Token } from "../src/internal/changeTokenBalance";
import type { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import type { ChangeEtherBalance } from "./contracts";

import { expect, AssertionError } from "chai";
import path from "path";
import util from "util";

import "../src/internal/add-chai-matchers";
import { useEnvironment, useEnvironmentWithNode } from "./helpers";

describe("INTEGRATION: changeEtherBalance matcher", function () {
  describe("with the in-process hardhat network", function () {
    useEnvironment("hardhat-project");

    runTests();
  });

  // TODO re-enable this when
  // https://github.com/ethers-io/ethers.js/issues/4014 is fixed
  describe.skip("connected to a hardhat node", function () {
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

    describe("Transaction Callback (legacy tx)", () => {
      describe("Change balance, one account", () => {
        it("Should pass when expected balance change is passed as string and is equal to an actual", async () => {
          await expect(() =>
            sender.sendTransaction({
              to: receiver.address,
              value: 200,
            })
          ).to.changeEtherBalance(sender, "-200");
        });

        it("Should fail when block contains more than one transaction", async function () {
          await this.hre.network.provider.send("evm_setAutomine", [false]);

          // we set a gas limit to avoid using the whole block gas limit
          await sender.sendTransaction({
            to: receiver.address,
            value: 200,
            gasLimit: 30_000,
          });

          await this.hre.network.provider.send("evm_setAutomine", [true]);

          await expect(
            expect(() =>
              sender.sendTransaction({
                to: receiver.address,
                value: 200,
                gasLimit: 30_000,
              })
            ).to.changeEtherBalance(sender, -200, { includeFee: true })
          ).to.be.eventually.rejectedWith(
            Error,
            "Multiple transactions found in block"
          );
        });

        it("Should pass when given an address as a string", async () => {
          await expect(() =>
            sender.sendTransaction({
              to: receiver.address,
              value: 200,
            })
          ).to.changeEtherBalance(sender.address, "-200");
        });

        it("Should pass when given a native bigint", async () => {
          await expect(() =>
            sender.sendTransaction({
              to: receiver.address,
              value: 200,
            })
          ).to.changeEtherBalance(sender, BigInt("-200"));
        });

        it("Should pass when given a predicate", async () => {
          await expect(() =>
            sender.sendTransaction({
              to: receiver.address,
              value: 200,
            })
          ).to.changeEtherBalance(
            sender,
            (diff: bigint) => diff === BigInt("-200")
          );
        });

        it("Should pass when expected balance change is passed as int and is equal to an actual", async () => {
          await expect(() =>
            sender.sendTransaction({
              to: receiver.address,
              value: 200,
            })
          ).to.changeEtherBalance(receiver, 200);
        });

        it("Should take into account transaction fee", async () => {
          await expect(() =>
            sender.sendTransaction({
              to: receiver.address,
              gasPrice: 1,
              value: 200,
            })
          ).to.changeEtherBalance(sender, -(txGasFees + 200), {
            includeFee: true,
          });
        });

        it("Should take into account transaction fee when given a predicate", async () => {
          await expect(() =>
            sender.sendTransaction({
              to: receiver.address,
              gasPrice: 1,
              value: 200,
            })
          ).to.changeEtherBalance(
            sender,
            (diff: bigint) => diff === BigInt(-(txGasFees + 200)),
            {
              includeFee: true,
            }
          );
        });

        it("Should ignore fee if receiver's wallet is being checked and includeFee was set", async () => {
          await expect(() =>
            sender.sendTransaction({
              to: receiver.address,
              gasPrice: 1,
              value: 200,
            })
          ).to.changeEtherBalance(receiver, 200, { includeFee: true });
        });

        it("Should take into account transaction fee by default", async () => {
          await expect(() =>
            sender.sendTransaction({
              to: receiver.address,
              gasPrice: 1,
              value: 200,
            })
          ).to.changeEtherBalance(sender, -200);
        });

        it("Should pass on negative case when expected balance does not satisfy the predicate", async () => {
          await expect(() =>
            sender.sendTransaction({
              to: receiver.address,
              value: 200,
            })
          ).to.not.changeEtherBalance(
            receiver,
            (diff: bigint) => diff === BigInt(300)
          );
        });

        it("Should throw when fee was not calculated correctly", async () => {
          await expect(
            expect(() =>
              sender.sendTransaction({
                to: receiver.address,
                gasPrice: 1,
                value: 200,
              })
            ).to.changeEtherBalance(sender, -200, { includeFee: true })
          ).to.be.eventually.rejectedWith(
            AssertionError,
            `Expected the ether balance of "${
              sender.address
            }" to change by -200 wei, but it changed by -${txGasFees + 200} wei`
          );
        });

        it("Should throw when expected balance change value was different from an actual", async () => {
          await expect(
            expect(() =>
              sender.sendTransaction({
                to: receiver.address,
                value: 200,
              })
            ).to.changeEtherBalance(sender, "-500")
          ).to.be.eventually.rejectedWith(
            AssertionError,
            `Expected the ether balance of "${sender.address}" to change by -500 wei, but it changed by -200 wei`
          );
        });

        it("Should throw when actual balance change value does not satisfy the predicate", async () => {
          await expect(
            expect(() =>
              sender.sendTransaction({
                to: receiver.address,
                value: 200,
              })
            ).to.changeEtherBalance(
              sender,
              (diff: bigint) => diff === BigInt(-500)
            )
          ).to.be.eventually.rejectedWith(
            AssertionError,
            `Expected the ether balance change of "${sender.address}" to satisfy the predicate, but it didn't (balance change: -200 wei)`
          );
        });

        it("Should throw in negative case when expected balance change value was equal to an actual", async () => {
          await expect(
            expect(() =>
              sender.sendTransaction({
                to: receiver.address,
                value: 200,
              })
            ).to.not.changeEtherBalance(sender, "-200")
          ).to.be.eventually.rejectedWith(
            AssertionError,
            `Expected the ether balance of "${sender.address}" NOT to change by -200 wei, but it did`
          );
        });

        it("Should throw in negative case when expected balance change value satisfies the predicate", async () => {
          await expect(
            expect(() =>
              sender.sendTransaction({
                to: receiver.address,
                value: 200,
              })
            ).to.not.changeEtherBalance(
              sender,
              (diff: bigint) => diff === BigInt(-200)
            )
          ).to.be.eventually.rejectedWith(
            AssertionError,
            `Expected the ether balance change of "${sender.address}" to NOT satisfy the predicate, but it did (balance change: -200 wei)`
          );
        });

        it("Should pass when given zero value tx", async () => {
          await expect(() =>
            sender.sendTransaction({ to: receiver.address, value: 0 })
          ).to.changeEtherBalance(sender, 0);
        });

        it("shouldn't run the transaction twice", async function () {
          const receiverBalanceBefore: bigint =
            await this.hre.ethers.provider.getBalance(receiver);

          await expect(() =>
            sender.sendTransaction({
              to: receiver.address,
              value: 200,
            })
          ).to.changeEtherBalance(sender, -200);

          const receiverBalanceAfter: bigint =
            await this.hre.ethers.provider.getBalance(receiver);
          const receiverBalanceChange =
            receiverBalanceAfter - receiverBalanceBefore;

          expect(receiverBalanceChange).to.equal(200n);
        });
      });

      describe("Change balance, one contract", () => {
        it("Should pass when expected balance change is passed as int and is equal to an actual", async () => {
          await expect(async () =>
            sender.sendTransaction({
              to: contract,
              value: 200,
            })
          ).to.changeEtherBalance(contract, 200);
        });

        it("should pass when calling function that returns half the sent ether", async () => {
          await expect(async () =>
            contract.returnHalf({ value: 200 })
          ).to.changeEtherBalance(sender, -100);
        });
      });
    });

    describe("Transaction Callback (1559 tx)", () => {
      describe("Change balance, one account", () => {
        it("Should pass when expected balance change is passed as string and is equal to an actual", async () => {
          await expect(() =>
            sender.sendTransaction({
              to: receiver.address,
              maxFeePerGas: 2,
              maxPriorityFeePerGas: 1,
              value: 200,
            })
          ).to.changeEtherBalance(sender, "-200");
        });

        it("Should pass when expected balance change is passed as int and is equal to an actual", async () => {
          await expect(() =>
            sender.sendTransaction({
              to: receiver.address,
              maxFeePerGas: 2,
              maxPriorityFeePerGas: 1,
              value: 200,
            })
          ).to.changeEtherBalance(receiver, 200);
        });

        it("Should take into account transaction fee", async () => {
          await expect(() =>
            sender.sendTransaction({
              to: receiver.address,
              maxFeePerGas: 2,
              maxPriorityFeePerGas: 1,
              value: 200,
            })
          ).to.changeEtherBalance(sender, -(txGasFees + 200), {
            includeFee: true,
          });
        });

        it("Should ignore fee if receiver's wallet is being checked and includeFee was set", async () => {
          await expect(() =>
            sender.sendTransaction({
              to: receiver.address,
              maxFeePerGas: 2,
              maxPriorityFeePerGas: 1,
              value: 200,
            })
          ).to.changeEtherBalance(receiver, 200, { includeFee: true });
        });

        it("Should take into account transaction fee by default", async () => {
          await expect(() =>
            sender.sendTransaction({
              to: receiver.address,
              maxFeePerGas: 2,
              maxPriorityFeePerGas: 1,
              value: 200,
            })
          ).to.changeEtherBalance(sender, -200);
        });

        it("Should throw when fee was not calculated correctly", async () => {
          await expect(
            expect(() =>
              sender.sendTransaction({
                to: receiver.address,
                maxFeePerGas: 2,
                maxPriorityFeePerGas: 1,
                value: 200,
              })
            ).to.changeEtherBalance(sender, -200, { includeFee: true })
          ).to.be.eventually.rejectedWith(
            AssertionError,
            `Expected the ether balance of "${
              sender.address
            }" to change by -200 wei, but it changed by -${txGasFees + 200} wei`
          );
        });

        it("Should throw when expected balance change value was different from an actual", async () => {
          await expect(
            expect(() =>
              sender.sendTransaction({
                to: receiver.address,
                maxFeePerGas: 2,
                maxPriorityFeePerGas: 1,
                value: 200,
              })
            ).to.changeEtherBalance(sender, "-500")
          ).to.be.eventually.rejectedWith(
            AssertionError,
            `Expected the ether balance of "${sender.address}" to change by -500 wei, but it changed by -200 wei`
          );
        });

        it("Should throw in negative case when expected balance change value was equal to an actual", async () => {
          await expect(
            expect(() =>
              sender.sendTransaction({
                to: receiver.address,
                maxFeePerGas: 2,
                maxPriorityFeePerGas: 1,
                value: 200,
              })
            ).to.not.changeEtherBalance(sender, "-200")
          ).to.be.eventually.rejectedWith(
            AssertionError,
            `Expected the ether balance of "${sender.address}" NOT to change by -200 wei, but it did`
          );
        });
      });

      describe("Change balance, one contract", () => {
        it("Should pass when expected balance change is passed as int and is equal to an actual", async () => {
          await expect(async () =>
            sender.sendTransaction({
              to: contract,
              maxFeePerGas: 2,
              maxPriorityFeePerGas: 1,
              value: 200,
            })
          ).to.changeEtherBalance(contract, 200);
        });

        it("Should take into account transaction fee", async function () {
          const tx = {
            to: contract,
            maxFeePerGas: 2,
            maxPriorityFeePerGas: 1,
            value: 200,
          };

          const gas: bigint = await this.hre.ethers.provider.estimateGas(tx);

          await expect(() => sender.sendTransaction(tx)).to.changeEtherBalance(
            sender,
            -(gas + 200n),
            {
              includeFee: true,
            }
          );
        });

        it("should pass when calling function that returns half the sent ether", async () => {
          await expect(async () =>
            contract.returnHalf({
              value: 200,
              maxFeePerGas: 2,
              maxPriorityFeePerGas: 1,
            })
          ).to.changeEtherBalance(sender, -100);
        });
      });

      it("shouldn't run the transaction twice", async function () {
        const receiverBalanceBefore: bigint =
          await this.hre.ethers.provider.getBalance(receiver);

        await expect(() =>
          sender.sendTransaction({
            to: receiver.address,
            maxFeePerGas: 2,
            maxPriorityFeePerGas: 1,
            value: 200,
          })
        ).to.changeEtherBalance(sender, -200);

        const receiverBalanceAfter: bigint =
          await this.hre.ethers.provider.getBalance(receiver);
        const receiverBalanceChange =
          receiverBalanceAfter - receiverBalanceBefore;

        expect(receiverBalanceChange).to.equal(200n);
      });
    });

    describe("Transaction Response", () => {
      describe("Change balance, one account", () => {
        it("Should pass when expected balance change is passed as string and is equal to an actual", async () => {
          await expect(
            await sender.sendTransaction({
              to: receiver.address,
              value: 200,
            })
          ).to.changeEtherBalance(sender, "-200");
        });

        it("Should pass when expected balance change is passed as int and is equal to an actual", async () => {
          await expect(
            await sender.sendTransaction({
              to: receiver.address,
              value: 200,
            })
          ).to.changeEtherBalance(receiver, 200);
        });

        it("Should throw when expected balance change value was different from an actual", async () => {
          await expect(
            expect(
              await sender.sendTransaction({
                to: receiver.address,
                value: 200,
              })
            ).to.changeEtherBalance(sender, "-500")
          ).to.be.eventually.rejectedWith(
            AssertionError,
            `Expected the ether balance of "${sender.address}" to change by -500 wei, but it changed by -200 wei`
          );
        });

        it("Should throw in negative case when expected balance change value was equal to an actual", async () => {
          await expect(
            expect(
              await sender.sendTransaction({
                to: receiver.address,
                value: 200,
              })
            ).to.not.changeEtherBalance(sender, "-200")
          ).to.be.eventually.rejectedWith(
            AssertionError,
            `Expected the ether balance of "${sender.address}" NOT to change by -200 wei, but it did`
          );
        });
      });

      describe("Change balance, one contract", () => {
        it("Should pass when expected balance change is passed as int and is equal to an actual", async () => {
          await expect(
            await sender.sendTransaction({
              to: contract,
              value: 200,
            })
          ).to.changeEtherBalance(contract, 200);
        });
      });
    });

    describe("Transaction Promise", () => {
      describe("Change balance, one account", () => {
        it("Should pass when expected balance change is passed as string and is equal to an actual", async () => {
          await expect(
            sender.sendTransaction({
              to: receiver.address,
              value: 200,
            })
          ).to.changeEtherBalance(sender, "-200");
        });

        it("Should pass when expected balance change is passed as int and is equal to an actual", async () => {
          await expect(
            sender.sendTransaction({
              to: receiver.address,
              value: 200,
            })
          ).to.changeEtherBalance(receiver, 200);
        });

        it("Should throw when expected balance change value was different from an actual", async () => {
          await expect(
            expect(
              sender.sendTransaction({
                to: receiver.address,
                value: 200,
              })
            ).to.changeEtherBalance(sender, "-500")
          ).to.be.eventually.rejectedWith(
            AssertionError,
            `Expected the ether balance of "${sender.address}" to change by -500 wei, but it changed by -200 wei`
          );
        });

        it("Should throw in negative case when expected balance change value was equal to an actual", async () => {
          await expect(
            expect(
              sender.sendTransaction({
                to: receiver.address,
                value: 200,
              })
            ).to.not.changeEtherBalance(sender, "-200")
          ).to.be.eventually.rejectedWith(
            AssertionError,
            `Expected the ether balance of "${sender.address}" NOT to change by -200 wei, but it did`
          );
        });

        it("Should throw if chained to another non-chainable method", () => {
          expect(() =>
            expect(
              sender.sendTransaction({
                to: receiver.address,
                value: 200,
              })
            )
              .to.changeTokenBalance(mockToken, receiver, 50)
              .and.to.changeEtherBalance(sender, "-200")
          ).to.throw(
            /The matcher 'changeEtherBalance' cannot be chained after 'changeTokenBalance'./
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
          ).to.changeEtherBalance(sender, -100);
        } catch (e: any) {
          expect(util.inspect(e)).to.include(
            path.join("test", "changeEtherBalance.ts")
          );

          return;
        }

        expect.fail("Expected an exception but none was thrown");
      });
    });
  }
});
