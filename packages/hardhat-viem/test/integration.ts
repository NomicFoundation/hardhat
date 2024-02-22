import type { Hex, TransactionReceipt } from "viem";
import type { EthereumProvider } from "hardhat/types";

import path from "path";
import { assert, expect } from "chai";
import sinon from "sinon";
import { getAddress, parseEther } from "viem";

import { TASK_CLEAN, TASK_COMPILE } from "hardhat/builtin-tasks/task-names";
import { deployContract, innerDeployContract } from "../src/internal/contracts";
import { EthereumMockedProvider } from "./mocks/provider";
import { assertSnapshotMatch, sleep, useEnvironment } from "./helpers";

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
          "sendDeploymentTransaction",
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

    beforeEach(async function () {
      await this.hre.network.provider.send("hardhat_reset");
    });

    describe("Clients", function () {
      it("should be able to query the blockchain using the public client", async function () {
        const client = await this.hre.viem.getPublicClient();
        const blockNumber = await client.getBlockNumber();

        assert.strictEqual(blockNumber, 0n);
      });

      it("should be able to query the blockchain using the wallet client", async function () {
        const publicClient = await this.hre.viem.getPublicClient();
        const [fromWalletClient, toWalletClient] =
          await this.hre.viem.getWalletClients();
        const fromAddress = fromWalletClient.account.address;
        const toAddress = toWalletClient.account.address;

        const fromBalanceBefore = await publicClient.getBalance({
          address: fromAddress,
        });
        const toBalanceBefore = await publicClient.getBalance({
          address: toAddress,
        });

        const etherAmount = parseEther("0.0001");
        const hash = await fromWalletClient.sendTransaction({
          to: toAddress,
          value: etherAmount,
        });
        const receipt = await publicClient.waitForTransactionReceipt({ hash });
        const transactionFee = receipt.gasUsed * receipt.effectiveGasPrice;

        const fromBalanceAfter = await publicClient.getBalance({
          address: fromAddress,
        });
        const toBalanceAfter = await publicClient.getBalance({
          address: toAddress,
        });

        assert.isDefined(receipt);
        assert.strictEqual(receipt.status, "success");
        assert.strictEqual(
          fromBalanceAfter,
          fromBalanceBefore - etherAmount - transactionFee
        );
        assert.strictEqual(toBalanceAfter, toBalanceBefore + etherAmount);
      });

      it("should be able to query the blockchain using the test client", async function () {
        const publicClient = await this.hre.viem.getPublicClient();
        const testClient = await this.hre.viem.getTestClient();

        await testClient.mine({
          blocks: 1000000,
        });
        const blockNumber = await publicClient.getBlockNumber();
        assert.strictEqual(blockNumber, 1000000n);
      });
    });

    describe("deployContract", function () {
      it("should be able to deploy a contract without constructor args", async function () {
        const contract = await this.hre.viem.deployContract(
          "WithoutConstructorArgs"
        );

        await contract.write.setData([50n]);
        const data = await contract.read.getData();
        assert.strictEqual(data, 50n);
      });

      it("should be able to deploy a contract with constructor args", async function () {
        const [defaultWalletClient] = await this.hre.viem.getWalletClients();
        const contract = await this.hre.viem.deployContract(
          "WithConstructorArgs",
          [50n]
        );

        let data = await contract.read.getData();
        assert.strictEqual(data, 50n);

        const owner = await contract.read.getOwner();
        assert.strictEqual(owner, getAddress(defaultWalletClient.account.address));

        await contract.write.setData([100n]);
        data = await contract.read.getData();
        assert.strictEqual(data, 100n);
      });

      it("should be able to deploy a contract with a different wallet client", async function () {
        const [_, secondWalletClient] = await this.hre.viem.getWalletClients();
        const contract = await this.hre.viem.deployContract(
          "WithoutConstructorArgs",
          [],
          { client: { wallet: secondWalletClient } }
        );

        const owner = await contract.read.getOwner();
        assert.strictEqual(owner, getAddress(secondWalletClient.account.address));
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

        assert.strictEqual(contractBalance, etherAmount);
        assert.strictEqual(
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

      it("should wait for confirmations", async function () {
        const publicClient = await this.hre.viem.getPublicClient();
        const testClient = await this.hre.viem.getTestClient();
        const sleepingTime = 2 * publicClient.pollingInterval;
        await testClient.setAutomine(false);

        let contractPromiseResolved = false;
        const contractPromise = this.hre.viem
          .deployContract("WithoutConstructorArgs", [], {
            confirmations: 5,
          })
          .then(() => {
            contractPromiseResolved = true;
          });
        await sleep(sleepingTime);
        assert.isFalse(contractPromiseResolved);

        await testClient.mine({
          blocks: 3,
        });
        await sleep(sleepingTime);
        assert.isFalse(contractPromiseResolved);

        await testClient.mine({
          blocks: 1,
        });
        await sleep(sleepingTime);
        assert.isFalse(contractPromiseResolved);

        await testClient.mine({
          blocks: 1,
        });
        await contractPromise;
        assert.isTrue(contractPromiseResolved);
      });

      it("should throw if the confirmations parameter is less than 0", async function () {
        await expect(
          this.hre.viem.deployContract("WithoutConstructorArgs", [], {
            confirmations: -1,
          })
        ).to.be.rejectedWith("Confirmations must be greater than 0.");
      });

      it("should throw if the confirmations parameter is 0", async function () {
        await expect(
          this.hre.viem.deployContract("WithoutConstructorArgs", [], {
            confirmations: 0,
          })
        ).to.be.rejectedWith(
          "deployContract does not support 0 confirmations. Use sendDeploymentTransaction if you want to handle the deployment transaction yourself."
        );
      });
    });

    describe("sendDeploymentTransaction", function () {
      it("should return the contract and the deployment transaction", async function () {
        const publicClient = await this.hre.viem.getPublicClient();
        const { contract, deploymentTransaction } =
          await this.hre.viem.sendDeploymentTransaction(
            "WithoutConstructorArgs"
          );
        assert.exists(contract);
        assert.exists(deploymentTransaction);

        const { contractAddress } =
          await publicClient.waitForTransactionReceipt({
            hash: deploymentTransaction.hash,
          });
        assert.strictEqual(contract.address, getAddress(contractAddress!));

        await contract.write.setData([50n]);
        const data = await contract.read.getData();
        assert.strictEqual(data, 50n);
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

    it("should generate artifacts.d.ts", async function () {
      const snapshotPath = path.join("snapshots", "artifacts.d.ts");
      const generatedFilePath = path.join("artifacts", "artifacts.d.ts");

      await assertSnapshotMatch(snapshotPath, generatedFilePath);
    });

    it("should generate contracts/A.sol/A.d.ts", async function () {
      const snapshotPath = path.join(
        "snapshots",
        "contracts",
        "A.sol",
        "A.d.ts"
      );
      const generatedFilePath = path.join(
        "artifacts",
        "contracts",
        "A.sol",
        "A.d.ts"
      );

      await assertSnapshotMatch(snapshotPath, generatedFilePath);
    });

    it("should generate contracts/A.sol/B.d.ts", async function () {
      const snapshotPath = path.join(
        "snapshots",
        "contracts",
        "A.sol",
        "B.d.ts"
      );
      const generatedFilePath = path.join(
        "artifacts",
        "contracts",
        "A.sol",
        "B.d.ts"
      );

      await assertSnapshotMatch(snapshotPath, generatedFilePath);
    });

    it("should generate contracts/A.sol/artifacts.d.ts", async function () {
      const snapshotPath = path.join(
        "snapshots",
        "contracts",
        "A.sol",
        "artifacts.d.ts"
      );
      const generatedFilePath = path.join(
        "artifacts",
        "contracts",
        "A.sol",
        "artifacts.d.ts"
      );

      await assertSnapshotMatch(snapshotPath, generatedFilePath);
    });

    it("should generate contracts/C.sol/B.d.ts", async function () {
      const snapshotPath = path.join(
        "snapshots",
        "contracts",
        "C.sol",
        "B.d.ts"
      );
      const generatedFilePath = path.join(
        "artifacts",
        "contracts",
        "C.sol",
        "B.d.ts"
      );

      await assertSnapshotMatch(snapshotPath, generatedFilePath);
    });

    it("should generate contracts/C.sol/C.d.ts", async function () {
      const snapshotPath = path.join(
        "snapshots",
        "contracts",
        "C.sol",
        "C.d.ts"
      );
      const generatedFilePath = path.join(
        "artifacts",
        "contracts",
        "C.sol",
        "C.d.ts"
      );

      await assertSnapshotMatch(snapshotPath, generatedFilePath);
    });

    it("should generate contracts/C.sol/artifacts.d.ts", async function () {
      const snapshotPath = path.join(
        "snapshots",
        "contracts",
        "C.sol",
        "artifacts.d.ts"
      );
      const generatedFilePath = path.join(
        "artifacts",
        "contracts",
        "C.sol",
        "artifacts.d.ts"
      );

      await assertSnapshotMatch(snapshotPath, generatedFilePath);
    });
  });
});
