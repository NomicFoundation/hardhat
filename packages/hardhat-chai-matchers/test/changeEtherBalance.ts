import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect, AssertionError } from "chai";
import { BigNumber, Contract } from "ethers";

import { useEnvironment, useEnvironmentWithNode } from "./helpers";

describe("INTEGRATION: changeEtherBalance matcher", function () {
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
          await sender.sendTransaction({ to: receiver.address, value: 200 });
          await this.hre.network.provider.send("evm_setAutomine", [true]);
          await expect(
            expect(() =>
              sender.sendTransaction({
                to: receiver.address,
                value: 200,
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

        it("Should pass when given an ethers BigNumber", async () => {
          await expect(() =>
            sender.sendTransaction({
              to: receiver.address,
              value: 200,
            })
          ).to.changeEtherBalance(sender, BigNumber.from("-200"));
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

        it("Should pass when expected balance change is passed as BN and is equal to an actual", async () => {
          await expect(() =>
            sender.sendTransaction({
              to: receiver.address,
              value: 200,
            })
          ).to.changeEtherBalance(receiver, BigNumber.from(200));
        });

        it("Should pass on negative case when expected balance change is not equal to an actual", async () => {
          await expect(() =>
            sender.sendTransaction({
              to: receiver.address,
              value: 200,
            })
          ).to.not.changeEtherBalance(receiver, BigNumber.from(300));
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
            `Expected "${
              sender.address
            }" to change balance by -200 wei, but it has changed by -${
              txGasFees + 200
            } wei`
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
            `Expected "${sender.address}" to change balance by -500 wei, but it has changed by -200 wei`
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
            `Expected "${sender.address}" to not change balance by -200 wei`
          );
        });

        it("Should pass when given zero value tx", async () => {
          await expect(() =>
            sender.sendTransaction({ to: receiver.address, value: 0 })
          ).to.changeEtherBalance(sender, 0);
        });
      });

      describe("Change balance, one contract", () => {
        it("Should pass when expected balance change is passed as int and is equal to an actual", async () => {
          await expect(async () =>
            sender.sendTransaction({
              to: contract.address,
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

        it("Should pass when expected balance change is passed as BN and is equal to an actual", async () => {
          await expect(() =>
            sender.sendTransaction({
              to: receiver.address,
              maxFeePerGas: 2,
              maxPriorityFeePerGas: 1,
              value: 200,
            })
          ).to.changeEtherBalance(receiver, BigNumber.from(200));
        });

        it("Should pass on negative case when expected balance change is not equal to an actual", async () => {
          await expect(() =>
            sender.sendTransaction({
              to: receiver.address,
              maxFeePerGas: 2,
              maxPriorityFeePerGas: 1,
              value: 200,
            })
          ).to.not.changeEtherBalance(receiver, BigNumber.from(300));
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
            `Expected "${
              sender.address
            }" to change balance by -200 wei, but it has changed by -${
              txGasFees + 200
            } wei`
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
            `Expected "${sender.address}" to change balance by -500 wei, but it has changed by -200 wei`
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
            `Expected "${sender.address}" to not change balance by -200 wei`
          );
        });
      });

      describe("Change balance, one contract", () => {
        it("Should pass when expected balance change is passed as int and is equal to an actual", async () => {
          await expect(async () =>
            sender.sendTransaction({
              to: contract.address,
              maxFeePerGas: 2,
              maxPriorityFeePerGas: 1,
              value: 200,
            })
          ).to.changeEtherBalance(contract, 200);
        });

        it("Should take into account transaction fee", async function () {
          const tx = {
            to: contract.address,
            maxFeePerGas: 2,
            maxPriorityFeePerGas: 1,
            value: 200,
          };

          const gas = await this.hre.ethers.provider.estimateGas(tx);

          await expect(() => sender.sendTransaction(tx)).to.changeEtherBalance(
            sender,
            -gas.add(200).toNumber(),
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

        it("Should pass when expected balance change is passed as BN and is equal to an actual", async () => {
          await expect(
            await sender.sendTransaction({
              to: receiver.address,
              value: 200,
            })
          ).to.changeEtherBalance(sender, BigNumber.from(-200));
        });

        it("Should pass on negative case when expected balance change is not equal to an actual", async () => {
          await expect(
            await sender.sendTransaction({
              to: receiver.address,
              value: 200,
            })
          ).to.not.changeEtherBalance(receiver, BigNumber.from(300));
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
            `Expected "${sender.address}" to change balance by -500 wei, but it has changed by -200 wei`
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
            `Expected "${sender.address}" to not change balance by -200 wei`
          );
        });
      });

      describe("Change balance, one contract", () => {
        it("Should pass when expected balance change is passed as int and is equal to an actual", async () => {
          await expect(
            await sender.sendTransaction({
              to: contract.address,
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

        it("Should pass when expected balance change is passed as BN and is equal to an actual", async () => {
          await expect(
            sender.sendTransaction({
              to: receiver.address,
              value: 200,
            })
          ).to.changeEtherBalance(sender, BigNumber.from(-200));
        });

        it("Should pass on negative case when expected balance change is not equal to an actual", async () => {
          await expect(
            sender.sendTransaction({
              to: receiver.address,
              value: 200,
            })
          ).to.not.changeEtherBalance(receiver, BigNumber.from(300));
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
            `Expected "${sender.address}" to change balance by -500 wei, but it has changed by -200 wei`
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
            `Expected "${sender.address}" to not change balance by -200 wei`
          );
        });
      });
    });
  }
});
