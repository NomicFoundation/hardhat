import type { NetworkHooks } from "@ignored/hardhat-vnext/types/hooks";
import type { HardhatRuntimeEnvironment } from "@ignored/hardhat-vnext/types/hre";
import type { TransactionReceipt as ViemTransactionReceipt } from "viem";

import assert from "node:assert/strict";
import { before, describe, it } from "node:test";

import { createHardhatRuntimeEnvironment } from "@ignored/hardhat-vnext/hre";
import { HardhatError } from "@ignored/hardhat-vnext-errors";
import { ensureError } from "@ignored/hardhat-vnext-utils/error";
import { sleep } from "@ignored/hardhat-vnext-utils/lang";
import {
  assertIsHardhatError,
  assertRejectsWithHardhatError,
  useFixtureProject,
} from "@nomicfoundation/hardhat-test-utils";
import { getAddress, parseEther } from "viem";

import HardhatViem from "../src/index.js";

describe("contracts", () => {
  describe("e2e", () => {
    useFixtureProject("default-ts-project");

    let hre: HardhatRuntimeEnvironment;

    before(async () => {
      hre = await createHardhatRuntimeEnvironment({
        plugins: [HardhatViem],
      });
      await hre.tasks.getTask("compile").run({});
    });

    describe("deployContract", () => {
      it("should be able to deploy a contract without constructor args", async () => {
        const networkConnection = await hre.network.connect();
        const contract = await networkConnection.viem.deployContract(
          "WithoutConstructorArgs",
        );

        await contract.write.setData([50n]);
        const data = await contract.read.getData();
        assert.equal(data, 50n);
      });

      it("should be able to deploy a contract with constructor args", async () => {
        const networkConnection = await hre.network.connect();
        const [defaultWalletClient] =
          await networkConnection.viem.getWalletClients();
        const contract = await networkConnection.viem.deployContract(
          "WithConstructorArgs",
          [50n],
        );

        let data = await contract.read.getData();
        assert.equal(data, 50n);

        const owner = await contract.read.getOwner();
        assert.equal(owner, getAddress(defaultWalletClient.account.address));

        await contract.write.setData([100n]);
        data = await contract.read.getData();
        assert.equal(data, 100n);
      });

      it("should be able to deploy a contract with a different wallet client", async () => {
        const networkConnection = await hre.network.connect();
        const [_, secondWalletClient] =
          await networkConnection.viem.getWalletClients();
        const contract = await networkConnection.viem.deployContract(
          "WithoutConstructorArgs",
          [],
          { client: { wallet: secondWalletClient } },
        );

        const owner = await contract.read.getOwner();
        assert.equal(owner, getAddress(secondWalletClient.account.address));
      });

      it("should be able to deploy a contract with initial ETH", async () => {
        const networkConnection = await hre.network.connect();
        const publicClient = await networkConnection.viem.getPublicClient();
        const [defaultWalletClient] =
          await networkConnection.viem.getWalletClients();
        const ownerBalanceBefore = await publicClient.getBalance({
          address: defaultWalletClient.account.address,
        });
        const etherAmount = parseEther("0.0001");
        const contract = await networkConnection.viem.deployContract(
          "WithoutConstructorArgs",
          [],
          { value: etherAmount },
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
          ownerBalanceBefore - etherAmount - transactionFee,
        );
      });

      it("should be able to deploy a contract with normal library linked", async () => {
        const networkConnection = await hre.network.connect();
        const normalLibContract =
          await networkConnection.viem.deployContract("NormalLib");

        const contract = await networkConnection.viem.deployContract(
          "OnlyNormalLib",
          [],
          {
            libraries: {
              NormalLib: normalLibContract.address,
            },
          },
        );

        const number = await contract.read.getNumber([2n]);
        assert.equal(number, 4n);
      });

      it("should be able to deploy a contract with constructor library linked", async () => {
        const networkConnection = await hre.network.connect();
        const ctorLibContract = await networkConnection.viem.deployContract(
          "contracts/WithLibs.sol:ConstructorLib",
        );

        const contract = await networkConnection.viem.deployContract(
          "OnlyConstructorLib",
          [2n],
          {
            libraries: {
              ConstructorLib: ctorLibContract.address,
            },
          },
        );

        const number = await contract.read.getNumber();
        assert.equal(number, 8n);
      });

      it("should be able to deploy a contract with both normal and constructor libraries linked", async () => {
        const networkConnection = await hre.network.connect();
        const [ctorLibContract, normalLibContract] = await Promise.all([
          networkConnection.viem.deployContract(
            "contracts/WithLibs.sol:ConstructorLib",
          ),
          networkConnection.viem.deployContract("NormalLib"),
        ]);

        const contract = await networkConnection.viem.deployContract(
          "BothLibs",
          [3n],
          {
            libraries: {
              ConstructorLib: ctorLibContract.address,
              NormalLib: normalLibContract.address,
            },
          },
        );

        const number = await contract.read.getNumber();
        assert.equal(number, 12n);

        const number2 = await contract.read.getNumber([5n]);
        assert.equal(number2, 10n);
      });

      // TODO: this test is skipped because it forks optimism mainnet, which is slow
      it.skip("should be able to deploy a contract to an optimistic network", async () => {
        hre = await createHardhatRuntimeEnvironment({
          plugins: [HardhatViem],
          networks: {
            edrOptimism: {
              type: "edr",
              chainId: 10,
              chainType: "optimism",
              forking: {
                url: "https://mainnet.optimism.io",
              },
              gas: "auto",
              gasMultiplier: 1,
              gasPrice: "auto",
            },
          },
        });

        const networkConnection = await hre.network.connect(
          "edrOptimism",
          "optimism",
        );
        const contract = await networkConnection.viem.deployContract(
          "WithoutConstructorArgs",
        );

        await contract.write.setData([50n]);
        const data = await contract.read.getData();
        assert.equal(data, 50n);
      });

      it("should throw an error if the contract address can't be retrieved", async (t) => {
        const networkConnection = await hre.network.connect();
        const publicClient = await networkConnection.viem.getPublicClient();
        const [walletClient] = await networkConnection.viem.getWalletClients();

        t.mock
          .method(publicClient, "waitForTransactionReceipt")
          .mock.mockImplementation(
            async () =>
              /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions
              -- The receipt is incomplete, but we only care about having a null contract */
              ({
                contractAddress: null,
              }) as unknown as ViemTransactionReceipt,
          );

        const deployContractSpy = t.mock.method(walletClient, "deployContract");
        const prevBlockNumber = await publicClient.getBlockNumber();

        try {
          await networkConnection.viem.deployContract(
            "WithoutConstructorArgs",
            [],
            {
              // passing the clients to use the mocked ones
              client: { public: publicClient, wallet: walletClient },
            },
          );

          assert.fail("Function did not throw any error");
        } catch (error) {
          ensureError(error);
          assertIsHardhatError(
            error,
            HardhatError.ERRORS.VIEM.DEPLOY_CONTRACT_ERROR,
            {
              txHash: await deployContractSpy.mock.calls[0].result,
              blockNumber: prevBlockNumber + 1n,
            },
          );
        }
      });

      it("should throw an error if no accounts are configured for the network", async () => {
        const onRequest: NetworkHooks["onRequest"] = async (
          context,
          netConn,
          jsonRpcRequest,
          next,
        ) => {
          if (jsonRpcRequest.method === "eth_accounts") {
            return {
              jsonrpc: "2.0",
              id: jsonRpcRequest.id,
              result: [],
            };
          }
          return next(context, netConn, jsonRpcRequest);
        };
        const networkHooks: Partial<NetworkHooks> = {
          onRequest,
        };

        hre.hooks.registerHandlers("network", networkHooks);

        const networkConnection = await hre.network.connect();

        await assertRejectsWithHardhatError(
          networkConnection.viem.deployContract("WithoutConstructorArgs"),
          HardhatError.ERRORS.VIEM.DEFAULT_WALLET_CLIENT_NOT_FOUND,
          {
            chainId: 31337,
          },
        ).finally(() => {
          hre.hooks.unregisterHandlers("network", networkHooks);
        });
      });

      // We add a timeout to this test to ensure it completes within a reasonable
      // time frame. This is important because we are waiting for multiple blocks
      // to be mined and for the contract deployment to be confirmed. Without a
      // timeout, the test could hang indefinitely if something goes wrong, such
      // as blocks not being mined or the contract not being deployed correctly.
      // This specific timeout helps avoid hitting the much higher global timeout
      // for tests.
      // TODO: analyze why this test is failing in the ci
      it.skip("should wait for confirmations", { timeout: 500 }, async () => {
        const networkConnection = await hre.network.connect();
        const publicClient = await networkConnection.viem.getPublicClient();
        const testClient = await networkConnection.viem.getTestClient();
        // We wait for twice the polling interval to ensure the client has
        // sufficient time to detect and process new blocks before checking
        // the number of confirmations. This helps avoid timing issues related
        // to polling delays and ensures accurate confirmation counts.
        // As the network is a development network, the polling interval is
        // set to 50ms, so we wait for 100ms, for a total of 300ms.
        const sleepingTime = 2 * publicClient.pollingInterval;
        await testClient.setAutomine(false);

        let contractPromiseResolved = false;
        const contractPromise = networkConnection.viem
          .deployContract("WithoutConstructorArgs", [], {
            confirmations: 5,
          })
          .then(() => {
            contractPromiseResolved = true;
          });
        await sleep(sleepingTime / 1000);
        assert.equal(contractPromiseResolved, false);

        await testClient.mine({
          blocks: 3,
        });
        await sleep(sleepingTime / 1000);
        assert.equal(contractPromiseResolved, false);

        await testClient.mine({
          blocks: 1,
        });
        await sleep(sleepingTime / 1000);
        assert.equal(contractPromiseResolved, false);

        await testClient.mine({
          blocks: 1,
        });
        // We need to wait for the promise to resolve, which will happen
        // inmediately. As we have automine disabled, this promise wouldn't
        // resolve if there were less than 5 confirmations and the test would
        // timeout.
        await contractPromise;
        assert.equal(contractPromiseResolved, true);
      });

      it("should throw if the confirmations parameter is less than 0", async () => {
        const networkConnection = await hre.network.connect();

        await assertRejectsWithHardhatError(
          networkConnection.viem.deployContract("WithoutConstructorArgs", [], {
            confirmations: -1,
          }),
          HardhatError.ERRORS.VIEM.INVALID_CONFIRMATIONS,
          {
            error: "Confirmations must be greather than 0.",
          },
        );
      });

      it("should throw if the confirmations parameter is 0", async () => {
        const networkConnection = await hre.network.connect();

        await assertRejectsWithHardhatError(
          networkConnection.viem.deployContract("WithoutConstructorArgs", [], {
            confirmations: 0,
          }),
          HardhatError.ERRORS.VIEM.INVALID_CONFIRMATIONS,
          {
            error:
              "deployContract does not support 0 confirmations. Use sendDeploymentTransaction if you want to handle the deployment transaction yourself.",
          },
        );
      });

      it("should throw if there are any missing libraries", async () => {
        const networkConnection = await hre.network.connect();

        await assertRejectsWithHardhatError(
          networkConnection.viem.deployContract("OnlyNormalLib"),
          HardhatError.ERRORS.VIEM.LINKING_CONTRACT_ERROR,
          {
            contractName: "OnlyNormalLib",
            error:
              "The following libraries are missing:\n" +
              '\t* "contracts/WithLibs.sol:NormalLib"\n' +
              "\n" +
              "Please provide all the required libraries.",
          },
        );
      });

      it("should throw if there are libraries that are not needed", async () => {
        const networkConnection = await hre.network.connect();
        const constructorLibContract =
          await networkConnection.viem.deployContract(
            "contracts/WithLibs.sol:ConstructorLib",
          );

        await assertRejectsWithHardhatError(
          networkConnection.viem.deployContract("NormalLib", [], {
            libraries: {
              ConstructorLib: constructorLibContract.address,
            },
          }),
          HardhatError.ERRORS.VIEM.LINKING_CONTRACT_ERROR,
          {
            contractName: "NormalLib",
            error:
              "The following libraries are not referenced by the contract:\n" +
              '\t* "ConstructorLib"\n' +
              "\n" +
              "Please provide only the libraries that are needed.",
          },
        );

        const normalLibContract =
          await networkConnection.viem.deployContract("NormalLib");

        await assertRejectsWithHardhatError(
          networkConnection.viem.deployContract("OnlyConstructorLib", [1n], {
            libraries: {
              ConstructorLib: constructorLibContract.address,
              NormalLib: normalLibContract.address,
            },
          }),
          HardhatError.ERRORS.VIEM.LINKING_CONTRACT_ERROR,
          {
            contractName: "OnlyConstructorLib",
            error:
              "The following libraries are not referenced by the contract:\n" +
              '\t* "NormalLib"\n' +
              "\n" +
              "Please provide only the libraries that are needed.",
          },
        );
      });

      it("should throw if the provided library names are ambiguous", async () => {
        const networkConnection = await hre.network.connect();
        const constructorLibConstructorLibContract =
          await networkConnection.viem.deployContract(
            "contracts/ConstructorLib.sol:ConstructorLib",
          );
        const withLibsConstructorLibContract =
          await networkConnection.viem.deployContract(
            "contracts/WithLibs.sol:ConstructorLib",
          );

        // BothConstructorLibs needs both libraries, but the library name is ambiguous
        // because it's the same for both libraries.
        await assertRejectsWithHardhatError(
          networkConnection.viem.deployContract("BothConstructorLibs", [1n], {
            libraries: {
              ConstructorLib: withLibsConstructorLibContract.address,
            },
          }),
          HardhatError.ERRORS.VIEM.LINKING_CONTRACT_ERROR,
          {
            contractName: "BothConstructorLibs",
            error:
              "The following libraries may resolve to multiple libraries:\n" +
              '\t* "ConstructorLib":\n' +
              '\t\t* "contracts/ConstructorLib.sol:ConstructorLib"\n' +
              '\t\t* "contracts/WithLibs.sol:ConstructorLib"\n' +
              "\n" +
              "Please provide the fully qualified name for these libraries.",
          },
        );

        // Even if we provide the fully qualified name for one of the libraries, the
        // error should still be thrown because the other library is still ambiguous.
        await assertRejectsWithHardhatError(
          networkConnection.viem.deployContract("BothConstructorLibs", [1n], {
            libraries: {
              "contracts/ConstructorLib.sol:ConstructorLib":
                constructorLibConstructorLibContract.address,
              ConstructorLib: withLibsConstructorLibContract.address,
            },
          }),
          HardhatError.ERRORS.VIEM.LINKING_CONTRACT_ERROR,
          {
            contractName: "BothConstructorLibs",
            error:
              "The following libraries may resolve to multiple libraries:\n" +
              '\t* "ConstructorLib":\n' +
              '\t\t* "contracts/ConstructorLib.sol:ConstructorLib"\n' +
              '\t\t* "contracts/WithLibs.sol:ConstructorLib"\n' +
              "\n" +
              "Please provide the fully qualified name for these libraries.",
          },
        );

        // Only after providing the fully qualified name for both libraries, the
        // contract can be deployed successfully.
        const contract = await networkConnection.viem.deployContract(
          "BothConstructorLibs",
          [2n],
          {
            libraries: {
              "contracts/ConstructorLib.sol:ConstructorLib":
                constructorLibConstructorLibContract.address,
              "contracts/WithLibs.sol:ConstructorLib":
                withLibsConstructorLibContract.address,
            },
          },
        );

        const number = await contract.read.getNumber();
        assert.equal(number, 64n);
      });

      it("should throw if the provided library names are overlapping", async () => {
        const networkConnection = await hre.network.connect();
        const constructorLibContract =
          await networkConnection.viem.deployContract(
            "contracts/WithLibs.sol:ConstructorLib",
          );

        // The contract needs the ConstructorLib library, but it was provided
        // twice: one with the name and one with the fully qualified name.
        await assertRejectsWithHardhatError(
          networkConnection.viem.deployContract("OnlyConstructorLib", [1n], {
            libraries: {
              ConstructorLib: constructorLibContract.address,
              "contracts/WithLibs.sol:ConstructorLib":
                constructorLibContract.address,
            },
          }),
          HardhatError.ERRORS.VIEM.LINKING_CONTRACT_ERROR,
          {
            contractName: "OnlyConstructorLib",
            error:
              "The following libraries are provided more than once:\n" +
              '\t* "contracts/WithLibs.sol:ConstructorLib"\n' +
              "\n" +
              "Please ensure that each library is provided only once, either by its name or its fully qualified name.",
          },
        );
      });

      it("should throw if the provided library addresses are invalid", async () => {
        const networkConnection = await hre.network.connect();

        await assertRejectsWithHardhatError(
          networkConnection.viem.deployContract("OnlyNormalLib", [], {
            libraries: {
              NormalLib: "0x123",
            },
          }),
          HardhatError.ERRORS.VIEM.LINKING_CONTRACT_ERROR,
          {
            contractName: "OnlyNormalLib",
            error:
              "The following libraries have invalid addresses:\n" +
              '\t* "NormalLib": "0x123"\n' +
              "\n" +
              "Please provide valid Ethereum addresses for these libraries.",
          },
        );
      });
    });

    describe("sendDeploymentTransaction", () => {
      it("should return the contract and the deployment transaction", async () => {
        const networkConnection = await hre.network.connect();
        const publicClient = await networkConnection.viem.getPublicClient();
        const { contract, deploymentTransaction } =
          await networkConnection.viem.sendDeploymentTransaction(
            "WithoutConstructorArgs",
          );
        assert.ok(contract !== undefined, "contract should be returned");
        assert.ok(
          deploymentTransaction !== undefined,
          "transaction should be returned",
        );

        const { contractAddress } =
          await publicClient.waitForTransactionReceipt({
            hash: deploymentTransaction.hash,
          });

        if (contractAddress === null || contractAddress === undefined) {
          throw new Error("Contract address should not be null or undefined");
        }

        assert.equal(contract.address, getAddress(contractAddress));

        await contract.write.setData([50n]);
        const data = await contract.read.getData();
        assert.equal(data, 50n);
      });

      it("should return the contract with linked libraries and the deployment transaction", async () => {
        const networkConnection = await hre.network.connect();
        const publicClient = await networkConnection.viem.getPublicClient();
        const normalLib =
          await networkConnection.viem.sendDeploymentTransaction(
            "NormalLib",
            [],
          );

        const { contractAddress: libContractAddress } =
          await publicClient.waitForTransactionReceipt({
            hash: normalLib.deploymentTransaction.hash,
          });

        if (libContractAddress === null || libContractAddress === undefined) {
          throw new Error("Contract address should not be null or undefined");
        }

        const { contract, deploymentTransaction } =
          await networkConnection.viem.sendDeploymentTransaction(
            "OnlyNormalLib",
            [],
            {
              libraries: { NormalLib: libContractAddress },
            },
          );
        assert.ok(contract !== undefined, "contract should be returned");
        assert.ok(
          deploymentTransaction !== undefined,
          "transaction should be returned",
        );

        const { contractAddress } =
          await publicClient.waitForTransactionReceipt({
            hash: deploymentTransaction.hash,
          });

        if (contractAddress === null || contractAddress === undefined) {
          throw new Error("Contract address should not be null or undefined");
        }

        assert.equal(contract.address, getAddress(contractAddress));

        const number = await contract.read.getNumber([50n]);
        assert.equal(number, 100n);
      });
    });
  });
});
