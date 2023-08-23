import { assert } from "chai";
import { parseEther } from "viem";

import { useEnvironment } from "./helpers";

describe("Integration tests", function () {
  useEnvironment("hardhat-project");

  describe("Hardhat Runtime Environment extension", function () {
    it("should add the viem object and it's properties", function () {
      assert.isDefined(this.hre.viem);
      assert.isFunction(this.hre.viem.getPublicClient);
      assert.isFunction(this.hre.viem.getWalletClients);
      assert.isFunction(this.hre.viem.getWalletClient);
      assert.isFunction(this.hre.viem.getTestClient);
    });
  });

  describe("Viem plugin", function () {
    it("should be able to query the blockchain using the public client", async function () {
      const client = await this.hre.viem.getPublicClient();
      const blockNumber = await client.getBlockNumber();

      assert.equal(blockNumber, 0n);
    });

    it("should be able to query the blockchain using the wallet client", async function () {
      const publicClient = await this.hre.viem.getPublicClient();
      const [fromWalletClient, toWalletClient] =
        await this.hre.viem.getWalletClients();
      const fromAddress = fromWalletClient.account.address;
      const toAddress = toWalletClient.account.address;

      const fromBalanceBefore: bigint = await publicClient.getBalance({
        address: fromAddress,
      });
      const toBalanceBefore: bigint = await publicClient.getBalance({
        address: toAddress,
      });

      const etherAmount = parseEther("0.0001");
      const hash = await fromWalletClient.sendTransaction({
        to: toAddress,
        value: etherAmount,
      });
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      const transactionFee = receipt.gasUsed * receipt.effectiveGasPrice;

      const fromBalanceAfter: bigint = await publicClient.getBalance({
        address: fromAddress,
      });
      const toBalanceAfter: bigint = await publicClient.getBalance({
        address: toAddress,
      });

      assert.isDefined(receipt);
      assert.equal(receipt.status, "success");
      assert.equal(
        fromBalanceAfter,
        fromBalanceBefore - etherAmount - transactionFee
      );
      assert.equal(toBalanceAfter, toBalanceBefore + etherAmount);
    });

    it("should be able to query the blockchain using the test client", async function () {
      const publicClient = await this.hre.viem.getPublicClient();
      const testClient = await this.hre.viem.getTestClient();

      await testClient.mine({
        blocks: 1000000,
      });
      const blockNumber = await publicClient.getBlockNumber();
      assert.equal(blockNumber, 1000001n);
    });
  });
});
