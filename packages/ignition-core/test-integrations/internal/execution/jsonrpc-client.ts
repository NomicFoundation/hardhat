import type { HardhatRuntimeEnvironment } from "hardhat/types/hre";

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import {
  assertRejects,
  assertRejectsWithHardhatError,
  useEphemeralFixtureProject,
} from "@nomicfoundation/hardhat-test-utils";

import type { Artifact } from "../../../src/index.js";
import {
  encodeArtifactDeploymentData,
  encodeArtifactFunctionCall,
} from "../../../src/internal/execution/abi.js";
import { EIP1193JsonRpcClient } from "../../../src/internal/execution/jsonrpc-client.js";
import { TransactionReceiptStatus } from "../../../src/internal/execution/types/jsonrpc.js";
import { assertIgnitionInvariant } from "../../../src/internal/utils/assertions.js";
import { createConnection, createClient } from "../../helpers/create-hre.js";

describe("JSON-RPC client", { timeout: 60000 }, () => {
  describe("With default hardhat project", () => {
    useEphemeralFixtureProject("default");

    async function deployContract({
      hre,
      client,
      accounts,
    }: {
      hre: HardhatRuntimeEnvironment;
      client: EIP1193JsonRpcClient;
      accounts: any[];
    }): Promise<{
      artifact: Artifact;
      address: string;
    }> {
      const artifact = await hre.artifacts.readArtifact("C");
      const fees = await client.getNetworkFees();

      const tx = await client.sendTransaction({
        data: encodeArtifactDeploymentData(artifact, [], {}),
        value: 0n,
        from: accounts[0],
        nonce: 0,
        fees,
        gasLimit: 1_000_000n,
      });

      const receipt = await client.getTransactionReceipt(tx);

      assert.notEqual(receipt, undefined);
      assert.equal(receipt!.status, TransactionReceiptStatus.SUCCESS);
      assert.notEqual(receipt!.contractAddress, undefined);

      return { artifact, address: receipt!.contractAddress! };
    }

    describe("getChainId", () => {
      it("Should return the chainId as number", async () => {
        const { client } = await createClient();
        const chainId = await client.getChainId();

        assert.equal(chainId, 31337);
      });
    });

    describe("getLatestBlock", () => {
      it("Should return the first block in the correct format", async () => {
        const { client } = await createClient();
        const block = await client.getLatestBlock();

        assert.equal(block.number, 0);
        assert.equal(typeof block.hash, "string");
        assert.equal(typeof block.baseFeePerGas, "bigint");
      });

      it("Should return the second block in the correct format", async () => {
        const { client, connection } = await createClient();
        await connection.provider.request({ method: "evm_mine" });
        const block = await client.getLatestBlock();

        assert.equal(block.number, 1);
        assert.equal(typeof block.hash, "string");
        assert.equal(typeof block.baseFeePerGas, "bigint");
      });
    });

    describe("getNetworkFees", () => {
      describe("With an EIP-1559 network (i.e. Hardhat Network)", () => {
        it("Should return information about EIP-1559 fees", async () => {
          const { client } = await createClient();
          const fees = await client.getNetworkFees();

          assert.ok("maxFeePerGas" in fees);
          assert.ok("maxPriorityFeePerGas" in fees);

          assert.equal(typeof fees.maxFeePerGas, "bigint");
          assert.equal(typeof fees.maxPriorityFeePerGas, "bigint");
          assert.equal(fees.maxFeePerGas > fees.maxPriorityFeePerGas, true);
        });

        it('Should throw if the "maxFeePerGas" exceeds the configured limit', async () => {
          const { client: failClient } = await createClient({
            maxFeePerGasLimit: 1n,
          });

          await assertRejectsWithHardhatError(
            failClient.getNetworkFees(),
            HardhatError.ERRORS.IGNITION.EXECUTION
              .MAX_FEE_PER_GAS_EXCEEDS_GAS_LIMIT,
            {},
          );
        });

        it("Should use the configured maxFeePerGas", async () => {
          const { client: maxFeeClient } = await createClient({
            maxFeePerGas: 1n,
          });
          const fees = await maxFeeClient.getNetworkFees();

          assert.ok("maxFeePerGas" in fees);

          assert.equal(fees.maxFeePerGas, 1n);
        });

        it("Should use the configured maxPriorityFeePerGas", async () => {
          const { client: maxFeeClient } = await createClient({
            maxPriorityFeePerGas: 1n,
          });
          const fees = await maxFeeClient.getNetworkFees();

          assert.ok("maxPriorityFeePerGas" in fees);

          assert.equal(fees.maxPriorityFeePerGas, 1n);
        });

        it("Should use return legacy fees when deploying to polygon network (chainId 137)", async () => {
          const polygonClient = new EIP1193JsonRpcClient(
            {
              request: async (req) => {
                if (req.method === "eth_chainId") {
                  return "0x89"; // 137
                }

                if (req.method === "eth_getBlockByNumber") {
                  return {
                    number: "0x0",
                    hash: "0x0",
                  };
                }

                if (req.method === "eth_gasPrice") {
                  return "0x1";
                }

                throw new Error(`Unimplemented mock for ${req.method}`);
              },
            },
            {
              maxPriorityFeePerGas: 1n,
            },
          );
          const fees = await polygonClient.getNetworkFees();

          assert.ok("gasPrice" in fees);

          assert.equal(fees.gasPrice, 1n);
        });

        it("Should return zero gas fees when deploying to a network with a zero base fee per gas (e.g. private Besu instances)", async () => {
          const besuClient = new EIP1193JsonRpcClient({
            request: async (req) => {
              if (req.method === "eth_chainId") {
                return "0x42";
              }

              if (req.method === "eth_getBlockByNumber") {
                return {
                  number: "0x0",
                  hash: "0x0",
                  baseFeePerGas: "0x0", // Set the base fee to zero
                };
              }

              if (req.method === "eth_gasPrice") {
                return "0x1";
              }

              throw new Error(`Unimplemented mock for ${req.method}`);
            },
          });

          const fees = await besuClient.getNetworkFees();

          assert.deepStrictEqual(fees, {
            maxFeePerGas: 0n,
            maxPriorityFeePerGas: 0n,
          });
        });

        it("Should not return zero gas fees for BNB Chain even with a zero base fee", async () => {
          const bnbClient = new EIP1193JsonRpcClient({
            request: async (req) => {
              if (req.method === "eth_chainId") {
                return "0x38"; // BNB Chain ID
              }

              if (req.method === "eth_getBlockByNumber") {
                return {
                  number: "0x0",
                  hash: "0x0",
                  baseFeePerGas: "0x0", // Set the base fee to zero, testing the exception
                };
              }

              if (req.method === "eth_gasPrice") {
                return "0x1";
              }

              throw new Error(`Unimplemented mock for ${req.method}`);
            },
          });

          const fees = await bnbClient.getNetworkFees();

          assert.deepStrictEqual(
            fees,
            {
              maxFeePerGas: 1_000_000_000n,
              maxPriorityFeePerGas: 1_000_000_000n,
            },
            "Both max fee and max priority fee should be 1 gwei, as the base fee is 0 for BNB Chain",
          );
        });

        it("Should not return zero gas fees for BNB Test Chain even with a zero base fee", async () => {
          const bnbTestClient = new EIP1193JsonRpcClient({
            request: async (req) => {
              if (req.method === "eth_chainId") {
                return "0x61"; // BNB Test Chain ID
              }

              if (req.method === "eth_getBlockByNumber") {
                return {
                  number: "0x0",
                  hash: "0x0",
                  baseFeePerGas: "0x0", // Set the base fee to zero, testing the exception
                };
              }

              if (req.method === "eth_gasPrice") {
                return "0x1";
              }

              throw new Error(`Unimplemented mock for ${req.method}`);
            },
          });

          const fees = await bnbTestClient.getNetworkFees();

          assert.deepStrictEqual(
            fees,
            {
              maxFeePerGas: 1_000_000_000n,
              maxPriorityFeePerGas: 1_000_000_000n,
            },
            "Both max fee and max priority fee should be 1 gwei, as the base fee is 0 for BNB Test Chain",
          );
        });

        it("Should use the `maxPriorityFeePerGas` from the node if `eth_maxPriorityFeePerGas` is present (and there is no config)", async () => {
          const connection = await createConnection();

          // TODO: Hardhat does not support `eth_maxPriorityFeePerGas` yet, when it does, this
          // can be removed.
          const proxiedProvider = {
            ...connection.provider,
            request: async (req: { method: string }) => {
              if (req.method === "eth_maxPriorityFeePerGas") {
                return "2000000000";
              }

              return connection.provider.request(req);
            },
          };

          const maxFeeClient = new EIP1193JsonRpcClient(proxiedProvider, {
            maxPriorityFeePerGas: undefined, // no config set for maxPriorityFeePerGas
          });

          const fees = await maxFeeClient.getNetworkFees();

          assert.ok("maxPriorityFeePerGas" in fees);

          assert.equal(fees.maxPriorityFeePerGas, 2_000_000_000n);
        });

        it("Should default to 1gwei for maxPriorityFeePerGas if `eth_maxPriorityFeePerGas` is not available and no config set", async () => {
          const connection = await createConnection();

          const proxiedProvider = {
            ...connection.provider,
            request: async (req: { method: string }) => {
              if (req.method === "eth_maxPriorityFeePerGas") {
                throw new Error(
                  "Method eth_maxPriorityFeePerGas is not supported",
                );
              }

              return connection.provider.request(req);
            },
          };

          const maxFeeClient = new EIP1193JsonRpcClient(proxiedProvider, {
            maxPriorityFeePerGas: undefined, // no config set for maxPriorityFeePerGas
          });

          const fees = await maxFeeClient.getNetworkFees();

          assert.ok("maxPriorityFeePerGas" in fees);

          assert.equal(fees.maxPriorityFeePerGas, 1_000_000_000n);
        });
      });
    });

    describe("call", () => {
      it("Should return the raw result in successful deployment calls", async () => {
        const { client, hre, connection } = await createClient();

        const accounts: any[] = await connection.provider.request({
          method: "eth_accounts",
          params: [],
        });

        const artifact = await hre.artifacts.readArtifact("C");
        const result = await client.call(
          {
            data: encodeArtifactDeploymentData(artifact, [], {}),
            value: 0n,
            from: accounts[0],
          },
          "latest",
        );

        assert.equal(result.success, true);
        assert.notEqual(result.returnData, "0x");
        assert.equal(result.customErrorReported, false);
      });

      it("Should return the raw result in successful non-deployment calls", async () => {
        const { client, hre, connection } = await createClient();

        const accounts: any[] = await connection.provider.request({
          method: "eth_accounts",
          params: [],
        });

        const { artifact, address } = await deployContract({
          hre,
          client,
          accounts,
        });

        const result = await client.call(
          {
            data: encodeArtifactFunctionCall(artifact, "returnString", []),
            value: 0n,
            from: accounts[0],
            to: address,
          },
          "latest",
        );

        // The ABI encoded representation of "hello"
        const abiEncodedHello =
          "0x0000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000000568656c6c6f000000000000000000000000000000000000000000000000000000";

        assert.equal(result.success, true);
        assert.equal(result.returnData, abiEncodedHello);
        assert.equal(result.customErrorReported, false);
      });

      it("Should not throw on execution failures, but return a result", async () => {
        const { client, connection } = await createClient();

        const accounts: any[] = await connection.provider.request({
          method: "eth_accounts",
          params: [],
        });

        // We send an invalid deployment transaction
        const result = await client.call(
          {
            data: "0x1234123120",
            value: 0n,
            from: accounts[0],
          },
          "latest",
        );

        assert.equal(result.success, false);
        assert.equal(result.returnData, "0x");
        assert.equal(result.customErrorReported, false);
      });

      it("Should return the returnData on execution failures", async () => {
        const { client, hre, connection } = await createClient();

        const accounts: any[] = await connection.provider.request({
          method: "eth_accounts",
          params: [],
        });

        const { artifact, address } = await deployContract({
          hre,
          client,
          accounts,
        });

        const result = await client.call(
          {
            data: encodeArtifactFunctionCall(
              artifact,
              "revertWithReasonMessage",
              [],
            ),
            value: 0n,
            from: accounts[0],
            to: address,
          },
          "latest",
        );

        // The ABI encoded representation of Error("reason")
        const abiEncodedHello =
          "0x08c379a000000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000006726561736f6e0000000000000000000000000000000000000000000000000000";

        assert.equal(result.success, false);
        assert.equal(result.returnData, abiEncodedHello);
        assert.equal(result.customErrorReported, false);
      });

      it("[Geth specific] Should return an empty returnData even when geth doesn't return it", async () => {
        // **NOTE**: This tests is mocked with the error messages that Geth returns
        let formatNumber = 0;

        const connection = await createConnection();

        const accounts: any[] = await connection.provider.request({
          method: "eth_accounts",
          params: [],
        });

        class MockProvider {
          public async request(req: { method: string; _: any[] }) {
            if (req.method === "eth_call") {
              formatNumber++;

              if (formatNumber === 1) {
                // Geth error message for reverts without reason
                throw new Error("execution reverted");
              }

              // Geth error message for invalid opcodes
              throw new Error("invalid opcode: INVALID");
            }

            assertIgnitionInvariant(
              false,
              `Unimplemented mock for ${req.method}`,
            );
          }
        }

        const mockClient = new EIP1193JsonRpcClient(new MockProvider());

        const result1 = await mockClient.call(
          {
            data: "0x",
            value: 0n,
            from: accounts[0],
          },
          "latest",
        );

        assert.equal(result1.success, false);
        assert.equal(result1.returnData, "0x");
        assert.equal(result1.customErrorReported, false);

        const result2 = await mockClient.call(
          {
            data: "0x",
            value: 0n,
            from: accounts[0],
          },
          "latest",
        );

        assert.equal(result2.success, false);
        assert.equal(result2.returnData, "0x");
        assert.equal(result2.customErrorReported, false);
      });

      it("[Other nodes] Should return an empty returnData if the error message indicates a revert", async () => {
        class MockProvider {
          public async request(req: { method: string; _: any[] }) {
            if (req.method === "eth_call") {
              throw new Error("something revert something");
            }

            assertIgnitionInvariant(
              false,
              `Unimplemented mock for ${req.method}`,
            );
          }
        }

        const mockClient = new EIP1193JsonRpcClient(new MockProvider());

        const connection = await createConnection();

        const accounts: any[] = await connection.provider.request({
          method: "eth_accounts",
          params: [],
        });

        const result1 = await mockClient.call(
          {
            data: "0x",
            value: 0n,
            from: accounts[0],
          },
          "latest",
        );

        assert.equal(result1.success, false);
        assert.equal(result1.returnData, "0x");
        assert.equal(result1.customErrorReported, false);
      });

      it("Should rethrow an HardhatError if the error message indicates an incorrectly configured base gas fee versus the node's block gas limit", async () => {
        class MockProvider {
          public async request(req: { method: string; _: any[] }) {
            if (req.method === "eth_call") {
              throw new Error("base fee exceeds gas limit");
            }

            assertIgnitionInvariant(
              false,
              `Unimplemented mock for ${req.method}`,
            );
          }
        }

        const mockClient = new EIP1193JsonRpcClient(new MockProvider());

        const connection = await createConnection();

        const accounts: any[] = await connection.provider.request({
          method: "eth_accounts",
          params: [],
        });

        await assertRejectsWithHardhatError(
          mockClient.call(
            {
              data: "0x",
              value: 0n,
              from: accounts[0],
            },
            "latest",
          ),
          HardhatError.ERRORS.IGNITION.EXECUTION.BASE_FEE_EXCEEDS_GAS_LIMIT,
          {},
        );
      });

      it("Should return customErrorReported true when the server reports a custom error", async () => {
        const { client, hre, connection } = await createClient();

        const accounts: any[] = await connection.provider.request({
          method: "eth_accounts",
          params: [],
        });

        const { artifact, address } = await deployContract({
          hre,
          client,
          accounts,
        });

        const result = await client.call(
          {
            data: encodeArtifactFunctionCall(
              artifact,
              "revertWithUnknownCustomError",
              [],
            ),
            value: 0n,
            from: accounts[0],
            to: address,
          },
          "latest",
        );

        assert.equal(result.success, false);
        assert.notEqual(result.returnData, "0x");
        assert.equal(result.customErrorReported, true);
      });

      it("Should return customErrorReported false when the server does not reports a custom error", async () => {
        const { client, hre, connection } = await createClient();

        const accounts: any[] = await connection.provider.request({
          method: "eth_accounts",
          params: [],
        });

        const { artifact, address } = await deployContract({
          hre,
          client,
          accounts,
        });

        const result = await client.call(
          {
            data: encodeArtifactFunctionCall(
              artifact,
              "revertWithInvalidData",
              [],
            ),
            value: 0n,
            from: accounts[0],
            to: address,
          },
          "latest",
        );

        assert.equal(result.success, false);
        assert.notEqual(result.returnData, "0x");
        assert.equal(result.customErrorReported, false);
      });

      it("Should accept pending as blockTag", async () => {
        // We disable automining, so the transaction is pending
        // and calls different between latest and pending
        const { client, connection, hre } = await createClient();

        await connection.provider.request({
          method: "evm_setAutomine",
          params: [false],
        });

        const accounts: any[] = await connection.provider.request({
          method: "eth_accounts",
          params: [],
        });

        const artifact = await hre.artifacts.readArtifact("C");
        const fees = await client.getNetworkFees();

        await client.sendTransaction({
          data: encodeArtifactDeploymentData(artifact, [], {}),
          value: 0n,
          from: accounts[0],
          nonce: 0,
          fees,
          gasLimit: 1_000_000n,
        });

        // We know the address from other tests doing the same
        const address = "0x5fbdb2315678afecb367f032d93f642f64180aa3";

        const resultLatest = await client.call(
          {
            data: encodeArtifactFunctionCall(
              artifact,
              "revertWithInvalidData",
              [],
            ),
            value: 0n,
            from: accounts[0],
            to: address,
          },
          "latest",
        );

        assert.equal(resultLatest.success, true);
        assert.equal(resultLatest.returnData, "0x");
        assert.equal(resultLatest.customErrorReported, false);

        const resultPending = await client.call(
          {
            data: encodeArtifactFunctionCall(
              artifact,
              "revertWithInvalidData",
              [],
            ),
            value: 0n,
            from: accounts[0],
            to: address,
          },
          "pending",
        );

        assert.equal(resultPending.success, false);
        assert.notEqual(resultPending.returnData, "0x");
        assert.equal(resultPending.customErrorReported, false);
      });

      // TODO: Should we test that eth_call validates the account balance?
      // TODO: Should we test that eth_call validates the nonce, maxFeePerGas, and maxPriorityFeePerGas?
    });

    describe("sendTransaction", () => {
      it("Should return the tx hash, even on execution failures", async () => {
        const { client, connection } = await createClient();

        const accounts: any[] = await connection.provider.request({
          method: "eth_accounts",
          params: [],
        });

        const fees = await client.getNetworkFees();

        // We send an invalid deployment transaction
        const result = await client.sendTransaction({
          data: "0x1234123120",
          value: 0n,
          from: accounts[0],
          nonce: 0,
          gasLimit: 5_000_000n,
          fees,
        });

        assert.equal(typeof result, "string");
      });

      it("Should return the tx hash in a network without automining", async () => {
        const { client, connection } = await createClient();

        const accounts: any[] = await connection.provider.request({
          method: "eth_accounts",
          params: [],
        });

        const fees = await client.getNetworkFees();

        // We disable the automining first
        await connection.provider.request({
          method: "evm_setAutomine",
          params: [false],
        });
        const result = await client.sendTransaction({
          to: accounts[0],
          data: "0x",
          value: 0n,
          from: accounts[0],
          nonce: 0,
          gasLimit: 5_000_000n,
          fees,
        });

        assert.equal(typeof result, "string");
      });
    });

    describe("getBalance", () => {
      it("Should return the latest balance of an account", async () => {
        const defaultHardhatNetworkBalance = 10n ** 18n * 10_000n;
        const nextBlockBaseFee = 875000000n;

        const { client, connection } = await createClient();

        const accounts: any[] = await connection.provider.request({
          method: "eth_accounts",
          params: [],
        });

        await client.sendTransaction({
          to: accounts[1],
          from: accounts[0],
          value: 1n,
          fees: {
            maxFeePerGas: nextBlockBaseFee,
            maxPriorityFeePerGas: 1n,
          },
          gasLimit: 21_000n,
          data: "0x",
          nonce: 0,
        });

        const balance = await client.getBalance(accounts[0], "latest");

        assert.equal(
          balance,
          defaultHardhatNetworkBalance - 21_000n * nextBlockBaseFee - 1n,
        );
      });

      // Skipped because Hardhat Network doesn't implement this correctly and
      // always returns the latest balance.
      it.skip("Should return the pending balance of an account", async () => {
        const { client, connection } = await createClient();

        const accounts: any[] = await connection.provider.request({
          method: "eth_accounts",
          params: [],
        });

        // We disable the automining first
        await connection.provider.request({
          method: "evm_setAutomine",
          params: [false],
        });

        await client.sendTransaction({
          to: accounts[1],
          from: accounts[0],
          value: 1n,
          fees: {
            maxFeePerGas: 1n,
            maxPriorityFeePerGas: 1n,
          },
          gasLimit: 21_000n,
          data: "0x",
          nonce: 0,
        });

        const defaultHardhatNetworkBalance = 10n ** 18n * 10_000n;

        const balance = await client.getBalance(accounts[0], "pending");

        assert.equal(balance, defaultHardhatNetworkBalance - 21_000n * 1n - 1n);
      });
    });

    describe("setBalance", () => {
      it("Should allow setting an account balance against a local hardhat node", async () => {
        const { client, connection } = await createClient();

        const accounts: any[] = await connection.provider.request({
          method: "eth_accounts",
          params: [],
        });

        // Arrange
        const balanceBefore = await client.getBalance(accounts[19], "latest");

        assert.equal(balanceBefore, 10000000000000000000000n);

        // Act
        await client.setBalance(accounts[19], 99999n);

        // Assert
        const balanceAfter = await client.getBalance(accounts[19], "latest");

        assert.equal(balanceAfter, 99999n);
      });

      it("Should allow setting an account balance against an anvil node", async () => {
        // Arrange

        const connection = await createConnection();

        const accounts: any[] = await connection.provider.request({
          method: "eth_accounts",
          params: [],
        });

        // we create a fake anvil client that will
        // correctly set a balance but return null rather
        // than a boolean.
        const fakeAnvilClient = new EIP1193JsonRpcClient({
          request: async (req) => {
            if (req.method === "hardhat_setBalance") {
              // Apply setBalance
              await connection.provider.request(req);

              // but return null as anvil would
              return null;
            }

            return connection.provider.request(req);
          },
        });

        const balanceBefore = await fakeAnvilClient.getBalance(
          accounts[19],
          "latest",
        );

        assert.equal(balanceBefore, 10000000000000000000000n);

        // Act
        await fakeAnvilClient.setBalance(accounts[19], 99999n);

        // Assert
        const balanceAfter = await fakeAnvilClient.getBalance(
          accounts[19],
          "latest",
        );

        assert.equal(balanceAfter, 99999n);
      });
    });

    describe("estimateGas", () => {
      it("Should return the estimate gas if the tx would succeed", async () => {
        const { client, connection } = await createClient();

        const accounts: any[] = await connection.provider.request({
          method: "eth_accounts",
          params: [],
        });

        const estimation = await client.estimateGas({
          to: accounts[1],
          from: accounts[0],
          value: 1n,
          fees: {
            maxFeePerGas: 1_000_000_000n,
            maxPriorityFeePerGas: 1n,
          },
          data: "0x",
          nonce: 0,
        });

        // The 1n comes from a bug in hardhat network
        assert.equal(estimation, 21_000n + 1n);
      });

      it("Should throw if the tx would not succeed", async () => {
        const { client, hre, connection } = await createClient();

        const accounts: any[] = await connection.provider.request({
          method: "eth_accounts",
          params: [],
        });

        const { artifact, address } = await deployContract({
          hre,
          client,
          accounts,
        });

        await assertRejects(
          client.estimateGas({
            to: address,
            from: accounts[0],
            data: encodeArtifactFunctionCall(
              artifact,
              "revertWithReasonMessage",
              [],
            ),
            nonce: 0,
            fees: {
              maxFeePerGas: 1_000_000_000n,
              maxPriorityFeePerGas: 1n,
            },
            value: 0n,
          }),
        );
      });
    });

    describe("getTransactionCount", () => {
      it("`latest` should return the amount of confirmed transactions", async () => {
        const { client, connection } = await createClient();

        const accounts: any[] = await connection.provider.request({
          method: "eth_accounts",
          params: [],
        });

        let count = await client.getTransactionCount(accounts[0], "latest");

        assert.equal(count, 0);

        await client.sendTransaction({
          to: accounts[1],
          from: accounts[0],
          value: 1n,
          fees: {
            maxFeePerGas: 1_000_000_000n,
            maxPriorityFeePerGas: 1n,
          },
          gasLimit: 21_000n,
          data: "0x",
          nonce: 0,
        });

        count = await client.getTransactionCount(accounts[0], "latest");

        assert.equal(count, 1);

        await client.sendTransaction({
          to: accounts[1],
          from: accounts[0],
          value: 1n,
          fees: {
            maxFeePerGas: 1_000_000_000n,
            maxPriorityFeePerGas: 1n,
          },
          gasLimit: 21_000n,
          data: "0x",
          nonce: 1,
        });

        count = await client.getTransactionCount(accounts[0], "latest");

        assert.equal(count, 2);
      });

      it("`pending` should return the amount of unconfirmed transactions", async () => {
        const { client, connection } = await createClient();

        const accounts: any[] = await connection.provider.request({
          method: "eth_accounts",
          params: [],
        });

        await connection.provider.request({
          method: "evm_setAutomine",
          params: [false],
        });
        let latestCount = await client.getTransactionCount(
          accounts[0],
          "latest",
        );

        let pendingCount = await client.getTransactionCount(
          accounts[0],
          "pending",
        );

        assert.equal(latestCount, 0);
        assert.equal(pendingCount, 0);

        await client.sendTransaction({
          to: accounts[1],
          from: accounts[0],
          value: 1n,
          fees: {
            maxFeePerGas: 1_000_000_000n,
            maxPriorityFeePerGas: 1n,
          },
          gasLimit: 21_000n,
          data: "0x",
          nonce: 0,
        });

        latestCount = await client.getTransactionCount(accounts[0], "latest");

        pendingCount = await client.getTransactionCount(accounts[0], "pending");

        assert.equal(latestCount, 0);
        assert.equal(pendingCount, 1);

        await client.sendTransaction({
          to: accounts[1],
          from: accounts[0],
          value: 1n,
          fees: {
            maxFeePerGas: 1_000_000_000n,
            maxPriorityFeePerGas: 1n,
          },
          gasLimit: 21_000n,
          data: "0x",
          nonce: 1,
        });

        latestCount = await client.getTransactionCount(accounts[0], "latest");

        pendingCount = await client.getTransactionCount(accounts[0], "pending");

        assert.equal(latestCount, 0);
        assert.equal(pendingCount, 2);
      });

      it("using a number should return the amount of confirmed transactions up to and including that block", async () => {
        const { client, connection } = await createClient();

        const accounts: any[] = await connection.provider.request({
          method: "eth_accounts",
          params: [],
        });

        await client.sendTransaction({
          to: accounts[1],
          from: accounts[0],
          value: 1n,
          fees: {
            maxFeePerGas: 1_000_000_000n,
            maxPriorityFeePerGas: 1n,
          },
          gasLimit: 21_000n,
          data: "0x",
          nonce: 0,
        });

        let latestCount = await client.getTransactionCount(
          accounts[0],
          "latest",
        );

        let blockOneCount = await client.getTransactionCount(accounts[0], 1);

        assert.equal(latestCount, 1);
        assert.equal(blockOneCount, 1);

        await client.sendTransaction({
          to: accounts[1],
          from: accounts[0],
          value: 1n,
          fees: {
            maxFeePerGas: 1_000_000_000n,
            maxPriorityFeePerGas: 1n,
          },
          gasLimit: 21_000n,
          data: "0x",
          nonce: 1,
        });

        latestCount = await client.getTransactionCount(accounts[0], "latest");

        blockOneCount = await client.getTransactionCount(accounts[0], 1);

        assert.equal(latestCount, 2);
        assert.equal(blockOneCount, 1);
      });
    });

    describe("getTransaction", () => {
      describe("On a EIP-1559 network", () => {
        describe("Confirmed transactions", () => {
          it("Should return its hash, network fees, blockNumber and blockHash", async () => {
            const { client, connection } = await createClient();

            const accounts: any[] = await connection.provider.request({
              method: "eth_accounts",
              params: [],
            });

            const req = {
              to: accounts[1],
              from: accounts[0],
              value: 1n,
              fees: {
                maxFeePerGas: 1_000_000_000n,
                maxPriorityFeePerGas: 1n,
              },
              gasLimit: 21_000n,
              data: "0x",
              nonce: 0,
            };

            const hash = await client.sendTransaction(req);

            const tx = await client.getTransaction(hash);

            assert.notEqual(tx, undefined);

            assert.equal(tx!.hash, hash);
            assert.ok("maxFeePerGas" in tx!.fees);
            assert.ok("maxPriorityFeePerGas" in tx!.fees);
            assert.ok("maxFeePerGas" in tx!.fees);
            assert.ok("maxPriorityFeePerGas" in tx!.fees);
            assert.equal(tx!.fees.maxFeePerGas, req.fees.maxFeePerGas);
            assert.equal(
              tx!.fees.maxPriorityFeePerGas,
              req.fees.maxPriorityFeePerGas,
            );
          });
        });

        describe("Pending transactions", () => {
          it("Should the tx if it is in the mempool", async () => {
            const { client, connection } = await createClient();

            const accounts: any[] = await connection.provider.request({
              method: "eth_accounts",
              params: [],
            });

            await connection.provider.request({
              method: "evm_setAutomine",
              params: [false],
            });

            const req = {
              to: accounts[1],
              from: accounts[0],
              value: 1n,
              fees: {
                maxFeePerGas: 1_000_000_000n,
                maxPriorityFeePerGas: 1n,
              },
              gasLimit: 21_000n,
              data: "0x",
              nonce: 0,
            };

            const hash = await client.sendTransaction(req);

            const tx = await client.getTransaction(hash);

            assert.notEqual(tx, undefined);
            assert.equal(tx!.hash, hash);
            assert.ok("maxFeePerGas" in tx!.fees);
            assert.ok("maxPriorityFeePerGas" in tx!.fees);
            assert.equal(tx!.fees.maxFeePerGas, req.fees.maxFeePerGas);
            assert.equal(
              tx!.fees.maxPriorityFeePerGas,
              req.fees.maxPriorityFeePerGas,
            );
          });

          it("Should return undefined if the transaction was never sent", async () => {
            const { client } = await createClient();

            const tx = await client.getTransaction(
              "0x0000000000000000000000000000000000000000000000000000000000000001",
            );

            assert.equal(tx, undefined);
          });

          it("Should return undefined if the transaction was replaced by a different one", async () => {
            const { client, connection } = await createClient();

            const accounts: any[] = await connection.provider.request({
              method: "eth_accounts",
              params: [],
            });

            await connection.provider.request({
              method: "evm_setAutomine",
              params: [false],
            });

            const firstReq = {
              to: accounts[1],
              from: accounts[0],
              value: 1n,
              fees: {
                maxFeePerGas: 1_000_000_000n,
                maxPriorityFeePerGas: 1n,
              },
              gasLimit: 21_000n,
              data: "0x",
              nonce: 0,
            };

            const firstTxHash = await client.sendTransaction(firstReq);

            const secondReq = {
              ...firstReq,
              fees: {
                maxFeePerGas: 2_000_000_000n,
                maxPriorityFeePerGas: 2n,
              },
            };

            await client.sendTransaction(secondReq);

            const tx = await client.getTransaction(firstTxHash);

            assert.equal(tx, undefined);
          });

          it("Should return undefined if the transaction was dropped", async () => {
            const { client, connection } = await createClient();

            const accounts: any[] = await connection.provider.request({
              method: "eth_accounts",
              params: [],
            });

            await connection.provider.request({
              method: "evm_setAutomine",
              params: [false],
            });

            const txHash = await client.sendTransaction({
              to: accounts[1],
              from: accounts[0],
              value: 1n,
              fees: {
                maxFeePerGas: 1_000_000_000n,
                maxPriorityFeePerGas: 1n,
              },
              gasLimit: 21_000n,
              data: "0x",
              nonce: 0,
            });

            await connection.provider.request({
              method: "hardhat_dropTransaction",
              params: [txHash],
            });

            const tx = await client.getTransaction(txHash);

            assert.equal(tx, undefined);
          });
        });
      });
    });

    describe("getTransactionReceipt", () => {
      describe("Confirmed transactions", () => {
        it("Should return the receipt if the transaction was successful", async () => {
          const { client, connection } = await createClient();

          const accounts: any[] = await connection.provider.request({
            method: "eth_accounts",
            params: [],
          });

          const hash = await client.sendTransaction({
            to: accounts[1],
            from: accounts[0],
            value: 1n,
            fees: {
              maxFeePerGas: 1_000_000_000n,
              maxPriorityFeePerGas: 1n,
            },
            gasLimit: 21_000n,
            data: "0x",
            nonce: 0,
          });

          const block = await client.getLatestBlock();

          const receipt = await client.getTransactionReceipt(hash);

          assert.notEqual(receipt, undefined);
          assert.equal(receipt!.blockHash, block.hash);
          assert.equal(receipt!.blockNumber, block.number);
          assert.equal(receipt!.status, TransactionReceiptStatus.SUCCESS);
          assert.equal(receipt!.contractAddress, undefined);
          assert.deepEqual(receipt!.logs, []);
        });

        it("Should return the contract address for successful deployment transactions", async () => {
          const { client, hre, connection } = await createClient();

          const accounts: any[] = await connection.provider.request({
            method: "eth_accounts",
            params: [],
          });

          const artifact = await hre.artifacts.readArtifact("C");
          const hash = await client.sendTransaction({
            from: accounts[0],
            value: 0n,
            fees: {
              maxFeePerGas: 1_000_000_000n,
              maxPriorityFeePerGas: 1n,
            },
            gasLimit: 1_000_000n,
            data: encodeArtifactDeploymentData(artifact, [], {}),
            nonce: 0,
          });

          const block = await client.getLatestBlock();

          const receipt = await client.getTransactionReceipt(hash);

          assert.notEqual(receipt, undefined);
          assert.equal(receipt!.blockHash, block.hash);
          assert.equal(receipt!.blockNumber, block.number);
          assert.equal(receipt!.status, TransactionReceiptStatus.SUCCESS);
          assert.notEqual(receipt!.contractAddress, undefined);
          assert.deepEqual(receipt!.logs, []);
        });

        it("Should return the receipt for reverted transactions", async () => {
          const { client, connection } = await createClient();

          const accounts: any[] = await connection.provider.request({
            method: "eth_accounts",
            params: [],
          });

          const hash = await client.sendTransaction({
            data: "0x1234123120",
            value: 0n,
            from: accounts[0],
            nonce: 0,
            gasLimit: 5_000_000n,
            fees: {
              maxFeePerGas: 1_000_000_000n,
              maxPriorityFeePerGas: 1n,
            },
          });

          const block = await client.getLatestBlock();

          const receipt = await client.getTransactionReceipt(hash);

          assert.notEqual(receipt, undefined);
          assert.equal(receipt!.blockHash, block.hash);
          assert.equal(receipt!.blockNumber, block.number);
          assert.equal(receipt!.status, TransactionReceiptStatus.FAILURE);
          assert.equal(receipt!.contractAddress, undefined);
          assert.deepEqual(receipt!.logs, []);
        });

        it("Should return the right logs", async () => {
          const { client, hre, connection } = await createClient();

          const accounts: any[] = await connection.provider.request({
            method: "eth_accounts",
            params: [],
          });

          const { artifact, address } = await deployContract({
            hre,
            client,
            accounts,
          });
          const hash = await client.sendTransaction({
            to: address,
            data: encodeArtifactFunctionCall(artifact, "events", []),
            value: 0n,
            from: accounts[0],
            nonce: 1,
            gasLimit: 5_000_000n,
            fees: {
              maxFeePerGas: 1_000_000_000n,
              maxPriorityFeePerGas: 1n,
            },
          });

          const block = await client.getLatestBlock();

          const receipt = await client.getTransactionReceipt(hash);

          assert.notEqual(receipt, undefined);
          assert.equal(receipt!.blockHash, block.hash);
          assert.equal(receipt!.blockNumber, block.number);
          assert.equal(receipt!.status, TransactionReceiptStatus.SUCCESS);
          assert.equal(receipt!.contractAddress, undefined);

          assert.ok(Array.isArray(receipt!.logs));
          assert.equal(receipt!.logs.length, 2);

          const event0 = receipt!.logs[0];
          const event1 = receipt!.logs[1];

          assert.equal(event0.address, address);
          assert.notEqual(event1.address, address);

          assert.equal(event0.logIndex, 0);
          assert.equal(event1.logIndex, 1);

          assert.notEqual(event0.data, "0x");
          assert.notEqual(event1.data, "0x");

          assert.notEqual(event0.topics[0], undefined);
          assert.notEqual(event0.topics[0], "0x");

          assert.notEqual(event1.topics[0], undefined);
          assert.notEqual(event1.topics[0], "0x");

          assert.notEqual(event0.topics[0], event1.topics[0]);
        });
      });

      describe("Pending transactions", () => {
        it("Should return undefined if the transaction is in the mempool", async () => {
          const { client, connection } = await createClient();

          const accounts: any[] = await connection.provider.request({
            method: "eth_accounts",
            params: [],
          });

          await connection.provider.request({
            method: "evm_setAutomine",
            params: [false],
          });

          const hash = await client.sendTransaction({
            to: accounts[1],
            from: accounts[0],
            value: 1n,
            fees: {
              maxFeePerGas: 1_000_000_000n,
              maxPriorityFeePerGas: 1n,
            },
            gasLimit: 21_000n,
            data: "0x",
            nonce: 0,
          });

          const receipt = await client.getTransactionReceipt(hash);

          assert.equal(receipt, undefined);
        });

        it("Should return undefined if the transaction was never sent", async () => {
          const { client } = await createClient();

          const receipt = await client.getTransactionReceipt(
            "0x0000000000000000000000000000000000000000000000000000000000000001",
          );

          assert.equal(receipt, undefined);
        });

        it("Should return undefined if the transaction was replaced by a different one", async () => {
          const { client, connection } = await createClient();

          const accounts: any[] = await connection.provider.request({
            method: "eth_accounts",
            params: [],
          });

          await connection.provider.request({
            method: "evm_setAutomine",
            params: [false],
          });

          const firstReq = {
            to: accounts[1],
            from: accounts[0],
            value: 1n,
            fees: {
              maxFeePerGas: 1_000_000_000n,
              maxPriorityFeePerGas: 1n,
            },
            gasLimit: 21_000n,
            data: "0x",
            nonce: 0,
          };

          const firstTxHash = await client.sendTransaction(firstReq);

          const secondReq = {
            ...firstReq,
            fees: {
              maxFeePerGas: 2_000_000_000n,
              maxPriorityFeePerGas: 2n,
            },
          };

          await client.sendTransaction(secondReq);

          const receipt = await client.getTransactionReceipt(firstTxHash);

          assert.equal(receipt, undefined);
        });

        it("Should return undefined if the transaction was dropped", async () => {
          const { client, connection } = await createClient();

          const accounts: any[] = await connection.provider.request({
            method: "eth_accounts",
            params: [],
          });

          await connection.provider.request({
            method: "evm_setAutomine",
            params: [false],
          });

          const txHash = await client.sendTransaction({
            to: accounts[1],
            from: accounts[0],
            value: 1n,
            fees: {
              maxFeePerGas: 1_000_000_000n,
              maxPriorityFeePerGas: 1n,
            },
            gasLimit: 21_000n,
            data: "0x",
            nonce: 0,
          });

          await connection.provider.request({
            method: "hardhat_dropTransaction",
            params: [txHash],
          });

          const receipt = await client.getTransactionReceipt(txHash);

          assert.equal(receipt, undefined);
        });
      });
    });
  });

  describe("With a hardhat network that doesn't throw on transaction errors", () => {
    /* cspell:disable-next-line */
    useEphemeralFixtureProject("dont-throw-on-reverts");

    describe("sendTransaction", () => {
      it("Should return the tx hash, even on execution failures", async () => {
        const { client, connection } = await createClient();

        const accounts: any[] = await connection.provider.request({
          method: "eth_accounts",
          params: [],
        });

        // We send an invalid deployment transaction
        const result = await client.sendTransaction({
          data: "0x1234123120",
          value: 0n,
          from: accounts[0],
          nonce: 0,
          gasLimit: 5_000_000n,
          fees: {
            maxFeePerGas: 1_000_000_000n,
            maxPriorityFeePerGas: 1n,
          },
        });

        assert.equal(typeof result, "string");
      });
    });
  });
});
