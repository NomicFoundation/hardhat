import type { Hex, TransactionReceipt } from "viem";
import type {
  EthereumProvider,
  HardhatRuntimeEnvironment,
} from "hardhat/types";

import path from "path";
// import { assert, expect } from "chai";
import { after, afterEach, before, beforeEach, describe, it } from "node:test";
import assert from "node:assert";
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

  after(function () {
    process.exit(0);
  });

  describe("Hardhat Runtime Environment extension", function () {
    const getHre = useEnvironment("hardhat-project");

    it("should add the viem object and it's properties", function () {
      // expect(getHre().viem)
      //   .to.be.an("object")
      //   .that.has.all.keys([
      //     "getPublicClient",
      //     "getWalletClients",
      //     "getWalletClient",
      //     "getTestClient",
      //     "deployContract",
      //     "sendDeploymentTransaction",
      //     "getContractAt",
      //   ]);
    });
  });

  describe("Viem plugin", function () {
    const getHre = useEnvironment("hardhat-project");

    before(async function () {
      await getHre().run(TASK_COMPILE, { quiet: true });
    });

    after(async function () {
      await getHre().run(TASK_CLEAN);
    });

    beforeEach(async function () {
      await getHre().network.provider.send("hardhat_reset");
    });

    describe("Clients", function () {
      it("should be able to query the blockchain using the public client", async function () {
        const client = await getHre().viem.getPublicClient();
        const blockNumber = await client.getBlockNumber();

        assert.equal(blockNumber, 0n);
      });

      it("should be able to query the blockchain using the wallet client", async function () {
        const publicClient = await getHre().viem.getPublicClient();
        const [fromWalletClient, toWalletClient] =
          await getHre().viem.getWalletClients();
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

        assert.notEqual(receipt, undefined);
        assert.equal(receipt.status, "success");
        assert.equal(
          fromBalanceAfter,
          fromBalanceBefore - etherAmount - transactionFee
        );
        assert.equal(toBalanceAfter, toBalanceBefore + etherAmount);
      });

      it("should be able to query the blockchain using the test client", async function () {
        const publicClient = await getHre().viem.getPublicClient();
        const testClient = await getHre().viem.getTestClient();

        await testClient.mine({
          blocks: 1000000,
        });
        const blockNumber = await publicClient.getBlockNumber();
        assert.equal(blockNumber, 1000000n);
      });
    });

    describe("deployContract", function () {
      it("should be able to deploy a contract without constructor args", async function () {
        const contract = await getHre().viem.deployContract(
          "WithoutConstructorArgs"
        );

        await contract.write.setData([50n]);
        const data = await contract.read.getData();
        assert.equal(data, 50n);
      });

      it("should be able to deploy a contract with constructor args", async function () {
        const [defaultWalletClient] = await getHre().viem.getWalletClients();
        const contract = await getHre().viem.deployContract(
          "WithConstructorArgs",
          [50n]
        );

        let data = await contract.read.getData();
        assert.equal(data, 50n);

        const owner = await contract.read.getOwner();
        assert.equal(owner, getAddress(defaultWalletClient.account.address));

        await contract.write.setData([100n]);
        data = await contract.read.getData();
        assert.equal(data, 100n);
      });

      it("should be able to deploy a contract with a different wallet client", async function () {
        const [_, secondWalletClient] = await getHre().viem.getWalletClients();
        const contract = await getHre().viem.deployContract(
          "WithoutConstructorArgs",
          [],
          { client: { wallet: secondWalletClient } }
        );

        const owner = await contract.read.getOwner();
        assert.equal(owner, getAddress(secondWalletClient.account.address));
      });

      it("should be able to deploy a contract with initial ETH", async function () {
        const publicClient = await getHre().viem.getPublicClient();
        const [defaultWalletClient] = await getHre().viem.getWalletClients();
        const ownerBalanceBefore = await publicClient.getBalance({
          address: defaultWalletClient.account.address,
        });
        const etherAmount = parseEther("0.0001");
        const contract = await getHre().viem.deployContract(
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
        const publicClient = await getHre().viem.getPublicClient();
        sinon.stub(publicClient, "waitForTransactionReceipt").returns(
          Promise.resolve({
            contractAddress: null,
          }) as unknown as Promise<TransactionReceipt>
        );
        const [walletClient] = await getHre().viem.getWalletClients();
        const contractArtifact = await getHre().artifacts.readArtifact(
          "WithoutConstructorArgs"
        );

        await assert.rejects(
          innerDeployContract(
            publicClient,
            walletClient,
            contractArtifact.abi,
            contractArtifact.bytecode as Hex,
            []
          )
        );
      });

      it("should throw an error if no accounts are configured for the network", async function () {
        const provider: EthereumProvider = new EthereumMockedProvider();
        const sendStub = sinon.stub(provider, "send");
        sendStub.withArgs("eth_accounts").returns(Promise.resolve([]));
        const hreTmp = {
          ...getHre(),
          network: {
            ...getHre().network,
            provider,
          },
        };

        await assert.rejects(deployContract(hreTmp, "WithoutConstructorArgs"));
      });

      it("should wait for confirmations", async function () {
        const publicClient = await getHre().viem.getPublicClient();
        const testClient = await getHre().viem.getTestClient();
        const sleepingTime = 2 * publicClient.pollingInterval;
        await testClient.setAutomine(false);

        let contractPromiseResolved = false;
        const contractPromise = getHre()
          .viem.deployContract("WithoutConstructorArgs", [], {
            confirmations: 5,
          })
          .then(() => {
            contractPromiseResolved = true;
          });
        await sleep(sleepingTime);
        assert.equal(contractPromiseResolved, false);

        await testClient.mine({
          blocks: 3,
        });
        await sleep(sleepingTime);
        assert.equal(contractPromiseResolved, false);

        await testClient.mine({
          blocks: 1,
        });
        await sleep(sleepingTime);
        assert.equal(contractPromiseResolved, false);

        await testClient.mine({
          blocks: 1,
        });
        await contractPromise;
        assert.equal(contractPromiseResolved, true);
      });

      it("should throw if the confirmations parameter is less than 0", async function () {
        await assert.rejects(
          getHre().viem.deployContract("WithoutConstructorArgs", [], {
            confirmations: -1,
          })
        );
      });

      it("should throw if the confirmations parameter is 0", async function () {
        await assert.rejects(
          getHre().viem.deployContract("WithoutConstructorArgs", [], {
            confirmations: 0,
          })
        );
      });
    });

    describe("sendDeploymentTransaction", function () {
      it("should return the contract and the deployment transaction", async function () {
        const publicClient = await getHre().viem.getPublicClient();
        const { contract, deploymentTransaction } =
          await getHre().viem.sendDeploymentTransaction(
            "WithoutConstructorArgs"
          );
        assert.ok(contract);
        assert.ok(deploymentTransaction);

        const { contractAddress } =
          await publicClient.waitForTransactionReceipt({
            hash: deploymentTransaction.hash,
          });
        assert.equal(contract.address, getAddress(contractAddress!));

        await contract.write.setData([50n]);
        const data = await contract.read.getData();
        assert.equal(data, 50n);
      });
    });
  });

  describe("Contract type generation", function () {
    const getHre = useEnvironment("type-generation");

    before(async function () {
      await getHre().run(TASK_COMPILE, { quiet: true });
    });

    after(async function () {
      await getHre().run(TASK_CLEAN);
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
