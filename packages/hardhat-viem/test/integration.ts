import type { Hex, TransactionReceipt } from "viem";
import type { EthereumProvider } from "hardhat/types";

import { assert, expect } from "chai";
import sinon from "sinon";
import { getAddress, parseEther } from "viem";

import { TASK_CLEAN, TASK_COMPILE } from "hardhat/builtin-tasks/task-names";
import { deployContract, innerDeployContract } from "../src/internal/contracts";
import { useEnvironment } from "./helpers";
import { EthereumMockedProvider } from "./mocks/provider";

describe("Integration tests", function () {
  afterEach(function () {
    sinon.restore();
  });

  describe("Hardhat Runtime Environment extension", function () {
    useEnvironment("hardhat-project");

    it("should add the viem object and it's properties", function () {
      expect(this.hre.viem)
        .to.be.an("object")
        .that.has.all.keys([
          "getPublicClient",
          "getWalletClients",
          "getWalletClient",
          "getTestClient",
          "deployContract",
          "getContractAt",
        ]);
    });
  });

  describe("Viem plugin", function () {
    useEnvironment("hardhat-project");

    before(async function () {
      await this.hre.run(TASK_COMPILE, { quiet: true });
    });

    after(async function () {
      await this.hre.run(TASK_CLEAN);
    });

    describe("Clients", function () {
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

    describe("deployContract", function () {
      it("should be able to deploy a contract without constructor args", async function () {
        const contract = await this.hre.viem.deployContract(
          "WithoutConstructorArgs"
        );

        await contract.write.setData([50n]);
        const data = await contract.read.getData();
        assert.equal(data, 50n);
      });

      it("should be able to deploy a contract with constructor args", async function () {
        const [defaultWalletClient] = await this.hre.viem.getWalletClients();
        const contract = await this.hre.viem.deployContract(
          "WithConstructorArgs",
          [50]
        );

        let data = await contract.read.getData();
        assert.equal(data, 50);

        const owner = await contract.read.getOwner();
        assert.equal(owner, getAddress(defaultWalletClient.account.address));

        await contract.write.setData([100]);
        data = await contract.read.getData();
        assert.equal(data, 100);
      });

      it("should be able to deploy a contract with a different wallet client", async function () {
        const [_, secondWalletClient] = await this.hre.viem.getWalletClients();
        const contract = await this.hre.viem.deployContract(
          "WithoutConstructorArgs",
          [],
          { walletClient: secondWalletClient }
        );

        const owner = await contract.read.getOwner();
        assert.equal(owner, getAddress(secondWalletClient.account.address));
      });

      it("should be able to deploy a contract with initial ETH", async function () {
        const publicClient = await this.hre.viem.getPublicClient();
        const [defaultWalletClient] = await this.hre.viem.getWalletClients();
        const ownerBalanceBefore = await publicClient.getBalance({
          address: defaultWalletClient.account.address,
        });
        const etherAmount = parseEther("0.0001");
        const contract = await this.hre.viem.deployContract(
          "WithoutConstructorArgs",
          [],
          { value: etherAmount }
        );
        const ownerBalanceAfter = await publicClient.getBalance({
          address: defaultWalletClient.account.address,
        });
        const contractBalance = await publicClient.getBalance({
          address: contract.address,
        });
        const block = await publicClient.getBlock({
          includeTransactions: true,
        });
        const receipt = await publicClient.getTransactionReceipt({
          hash: block.transactions[0].hash,
        });
        const transactionFee = receipt.gasUsed * receipt.effectiveGasPrice;

        assert.equal(contractBalance, etherAmount);
        assert.equal(
          ownerBalanceAfter,
          ownerBalanceBefore - etherAmount - transactionFee
        );
      });

      it("should throw an error if the contract address can't be retrieved", async function () {
        const publicClient = await this.hre.viem.getPublicClient();
        sinon.stub(publicClient, "waitForTransactionReceipt").returns(
          Promise.resolve({
            contractAddress: null,
          }) as unknown as Promise<TransactionReceipt>
        );
        const [walletClient] = await this.hre.viem.getWalletClients();
        const contractArtifact = await this.hre.artifacts.readArtifact(
          "WithoutConstructorArgs"
        );

        await expect(
          innerDeployContract(
            publicClient,
            walletClient,
            contractArtifact.abi,
            contractArtifact.bytecode as Hex,
            []
          )
        ).to.be.rejectedWith(
          /The deployment transaction '0x[a-fA-F0-9]{64}' was mined in block '\d+' but its receipt doesn't contain a contract address/
        );
      });

      it("should throw an error if no accounts are configured for the network", async function () {
        const provider: EthereumProvider = new EthereumMockedProvider();
        const sendStub = sinon.stub(provider, "send");
        sendStub.withArgs("eth_accounts").returns(Promise.resolve([]));
        const hre = {
          ...this.hre,
          network: {
            ...this.hre.network,
            provider,
          },
        };

        await expect(
          deployContract(hre, "WithoutConstructorArgs")
        ).to.be.rejectedWith(
          /Default wallet client not found. This can happen if no accounts were configured for this network/
        );
      });
    });
  });

  describe("Contract type generation", function () {
    useEnvironment("type-generation");

    before(async function () {
      await this.hre.run(TASK_COMPILE, { quiet: true });
    });

    after(async function () {
      await this.hre.run(TASK_CLEAN);
    });

    it("should generate a .d.ts file per contract", async function () {});
  });
});
