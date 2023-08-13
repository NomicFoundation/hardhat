import { assert } from "chai";

import { Artifact } from "../../../../src";
import {
  encodeArtifactDeploymentData,
  encodeArtifactFunctionCall,
} from "../../../../src/new-api/internal/new-execution/abi";
import {
  getLatestBlock,
  getNetworkFees,
  call,
  estimateGas,
  getTransaction,
  getTransactionCount,
  getTransactionReceipt,
  sendTransaction,
  NetworkFees,
  getBalance,
} from "../../../../src/new-api/internal/new-execution/jsonrpc-calls";
import { TransactionReceiptStatus } from "../../../../src/new-api/internal/new-execution/types/jsonrpc";
import { assertIgnitionInvariant } from "../../../../src/new-api/internal/utils/assertions";
import { useHardhatProject } from "../../../helpers/hardhat-projects";

describe("JSON-RPC calls", function () {
  describe("With default hardhat project", function () {
    useHardhatProject("default");

    async function deployContract({
      hre,
      accounts,
    }: {
      hre: any;
      accounts: any[];
    }): Promise<{
      artifact: Artifact;
      address: string;
    }> {
      const artifact = await hre.artifacts.readArtifact("C");
      const fees = await getNetworkFees(hre.network.provider);

      const tx = await sendTransaction(hre.network.provider, {
        data: await encodeArtifactDeploymentData(artifact, [], {}),
        value: 0n,
        from: accounts[0],
        nonce: 0,
        ...fees,
        gasLimit: 1_000_000n,
      });

      const receipt = await getTransactionReceipt(hre.network.provider, tx);

      assert.isDefined(receipt);
      assert.equal(receipt!.status, TransactionReceiptStatus.SUCCESS);
      assert.isDefined(receipt!.contractAddress);

      return { artifact, address: receipt!.contractAddress! };
    }

    describe("getLatestBlock", async function () {
      it("Should return the first block in the correct format", async function () {
        const block = await getLatestBlock(this.hre.network.provider);

        assert.equal(block.number, 0);
        assert.isString(block.hash);
        assert.typeOf(block.baseFeePerGas, "bigint");
      });

      it("Should return the second block in the correct format", async function () {
        await this.hre.network.provider.send("evm_mine");
        const block = await getLatestBlock(this.hre.network.provider);

        assert.equal(block.number, 1);
        assert.isString(block.hash);
        assert.typeOf(block.baseFeePerGas, "bigint");
      });
    });

    describe("getNetworkFees", async function () {
      it("Should return information about EIP-159 fees", async function () {
        const fees = await getNetworkFees(this.hre.network.provider);

        assert.typeOf(fees.maxFeePerGas, "bigint");
        assert.typeOf(fees.maxPriorityFeePerGas, "bigint");
        assert.isTrue(fees.maxFeePerGas > fees.maxPriorityFeePerGas);
      });
    });

    describe("call", function () {
      it("Should return the raw result in succesful deployment calls", async function () {
        const artifact = await this.hre.artifacts.readArtifact("C");
        const result = await call(
          this.hre.network.provider,
          {
            data: await encodeArtifactDeploymentData(artifact, [], {}),
            value: 0n,
            from: this.accounts[0],
          },
          "latest"
        );

        assert.isTrue(result.success);
        assert.notEqual(result.returnData, "0x");
        assert.isFalse(result.customErrorReported);
      });

      it("Should return the raw result in succesful non-deployment calls", async function () {
        const { artifact, address } = await deployContract(this);

        const result = await call(
          this.hre.network.provider,
          {
            data: encodeArtifactFunctionCall(artifact, "returnString", []),
            value: 0n,
            from: this.accounts[0],
            to: address,
          },
          "latest"
        );

        // The ABI encoded representation of "hello"
        const abiEncodedHello =
          "0x0000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000000568656c6c6f000000000000000000000000000000000000000000000000000000";

        assert.isTrue(result.success);
        assert.equal(result.returnData, abiEncodedHello);
        assert.isFalse(result.customErrorReported);
      });

      it("Should not throw on execution failures, but return a result", async function () {
        // We send an invalid deployment transaction
        const result = await call(
          this.hre.network.provider,
          {
            data: "0x1234123120",
            value: 0n,
            from: this.accounts[0],
          },
          "latest"
        );

        assert.isFalse(result.success);
        assert.equal(result.returnData, "0x");
        assert.isFalse(result.customErrorReported);
      });

      it("Should return the returnData on execution failures", async function () {
        const { artifact, address } = await deployContract(this);

        const result = await call(
          this.hre.network.provider,
          {
            data: encodeArtifactFunctionCall(
              artifact,
              "revertWithReasonMessage",
              []
            ),
            value: 0n,
            from: this.accounts[0],
            to: address,
          },
          "latest"
        );

        // The ABI encoded representation of Error("reason")
        const abiEncodedHello =
          "0x08c379a000000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000006726561736f6e0000000000000000000000000000000000000000000000000000";

        assert.isFalse(result.success);
        assert.equal(result.returnData, abiEncodedHello);
        assert.isFalse(result.customErrorReported);
      });

      it("[Geth specific] Should return an empty returnData even when geth doesn't return it", async function () {
        // **NOTE**: This tests is mocked with the error messages that Geth returns
        let formatNumber = 0;

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
              `Unimplemented mock for ${req.method}`
            );
          }
        }

        const result1 = await call(
          new MockProvider(),
          {
            data: "0x",
            value: 0n,
            from: this.accounts[0],
          },
          "latest"
        );

        assert.isFalse(result1.success);
        assert.equal(result1.returnData, "0x");
        assert.isFalse(result1.customErrorReported);

        const result2 = await call(
          new MockProvider(),
          {
            data: "0x",
            value: 0n,
            from: this.accounts[0],
          },
          "latest"
        );

        assert.isFalse(result2.success);
        assert.equal(result2.returnData, "0x");
        assert.isFalse(result2.customErrorReported);
      });

      it("[Other nodes] Should return an empty returnData if the error message indicates a revert", async function () {
        class MockProvider {
          public async request(req: { method: string; _: any[] }) {
            if (req.method === "eth_call") {
              throw new Error("something revert something");
            }

            assertIgnitionInvariant(
              false,
              `Unimplemented mock for ${req.method}`
            );
          }
        }

        const result1 = await call(
          new MockProvider(),
          {
            data: "0x",
            value: 0n,
            from: this.accounts[0],
          },
          "latest"
        );

        assert.isFalse(result1.success);
        assert.equal(result1.returnData, "0x");
        assert.isFalse(result1.customErrorReported);
      });

      it("Should return customErrorReported true when the server reports a custom error", async function () {
        const { artifact, address } = await deployContract(this);

        const result = await call(
          this.hre.network.provider,
          {
            data: encodeArtifactFunctionCall(
              artifact,
              "revertWithUnknownCustomError",
              []
            ),
            value: 0n,
            from: this.accounts[0],
            to: address,
          },
          "latest"
        );

        assert.isFalse(result.success);
        assert.notEqual(result.returnData, "0x");
        assert.isTrue(result.customErrorReported);
      });

      it("Should return customErrorReported false when the server does not reports a custom error", async function () {
        const { artifact, address } = await deployContract(this);

        const result = await call(
          this.hre.network.provider,
          {
            data: encodeArtifactFunctionCall(
              artifact,
              "revertWithInvalidData",
              []
            ),
            value: 0n,
            from: this.accounts[0],
            to: address,
          },
          "latest"
        );

        assert.isFalse(result.success);
        assert.notEqual(result.returnData, "0x");
        assert.isFalse(result.customErrorReported);
      });

      it("Should accept pending as blockTag", async function () {
        // We disable automining, so the transaction is pending
        // and calls differt between latest and pending

        await this.hre.network.provider.send("evm_setAutomine", [false]);

        const artifact = await this.hre.artifacts.readArtifact("C");
        const fees = await getNetworkFees(this.hre.network.provider);

        await sendTransaction(this.hre.network.provider, {
          data: await encodeArtifactDeploymentData(artifact, [], {}),
          value: 0n,
          from: this.accounts[0],
          nonce: 0,
          ...fees,
          gasLimit: 1_000_000n,
        });

        // We know the address from other tests doing the same
        const address = "0x5fbdb2315678afecb367f032d93f642f64180aa3";

        const resultLatest = await call(
          this.hre.network.provider,
          {
            data: encodeArtifactFunctionCall(
              artifact,
              "revertWithInvalidData",
              []
            ),
            value: 0n,
            from: this.accounts[0],
            to: address,
          },
          "latest"
        );

        assert.isTrue(resultLatest.success);
        assert.equal(resultLatest.returnData, "0x");
        assert.isFalse(resultLatest.customErrorReported);

        const resultPending = await call(
          this.hre.network.provider,
          {
            data: encodeArtifactFunctionCall(
              artifact,
              "revertWithInvalidData",
              []
            ),
            value: 0n,
            from: this.accounts[0],
            to: address,
          },
          "pending"
        );

        assert.isFalse(resultPending.success);
        assert.notEqual(resultPending.returnData, "0x");
        assert.isFalse(resultPending.customErrorReported);
      });

      // TODO: Should we test that eth_call validates the account balance?
      // TODO: Should we test that eth_call validates the nonce, maxFeePerGas, and maxPriorityFeePerGas?
    });

    describe("sendTransaction", function () {
      let fees: NetworkFees;
      before("Fetching fees", async function () {
        fees = await getNetworkFees(this.hre.network.provider);
      });

      it("Should return the tx hash, even on execution failures", async function () {
        // We send an invalid deployment transaction
        const result = await sendTransaction(this.hre.network.provider, {
          data: "0x1234123120",
          value: 0n,
          from: this.accounts[0],
          nonce: 0,
          gasLimit: 5_000_000n,
          ...fees,
        });

        assert.isString(result);
      });

      it("Should return the tx hash in a network without automining", async function () {
        // We disable the automining first
        await this.hre.network.provider.send("evm_setAutomine", [false]);
        const result = await sendTransaction(this.hre.network.provider, {
          to: this.accounts[0],
          data: "0x",
          value: 0n,
          from: this.accounts[0],
          nonce: 0,
          gasLimit: 5_000_000n,
          ...fees,
        });

        assert.isString(result);
      });
    });

    describe("getBalance", function () {
      it("Should return the latest balance of an account", async function () {
        const defaultHardhatNetworkBalance = 10n ** 18n * 10_000n;
        const nextBlockBaseFee = 875000000n;

        await sendTransaction(this.hre.network.provider, {
          to: this.accounts[1],
          from: this.accounts[0],
          value: 1n,
          maxFeePerGas: nextBlockBaseFee,
          maxPriorityFeePerGas: 1n,
          gasLimit: 21_000n,
          data: "0x",
          nonce: 0,
        });

        const balance = await getBalance(
          this.hre.network.provider,
          this.accounts[0],
          "latest"
        );

        assert.equal(
          balance,
          defaultHardhatNetworkBalance - 21_000n * nextBlockBaseFee - 1n
        );
      });

      // Skipped because Hardhat Network doesn't implement this correctly and
      // always returns the latest balance.
      it.skip("Should return the pending balance of an account", async function () {
        // We disable the automining first
        await this.hre.network.provider.send("evm_setAutomine", [false]);

        await sendTransaction(this.hre.network.provider, {
          to: this.accounts[1],
          from: this.accounts[0],
          value: 1n,
          maxFeePerGas: 1n,
          maxPriorityFeePerGas: 1n,
          gasLimit: 21_000n,
          data: "0x",
          nonce: 0,
        });

        const defaultHardhatNetworkBalance = 10n ** 18n * 10_000n;

        const balance = await getBalance(
          this.hre.network.provider,
          this.accounts[0],
          "pending"
        );

        assert.equal(balance, defaultHardhatNetworkBalance - 21_000n * 1n - 1n);
      });
    });

    describe("estimateGas", function () {
      it("Should return the estimate gas if the tx would succeed", async function () {
        const estimation = await estimateGas(this.hre.network.provider, {
          to: this.accounts[1],
          from: this.accounts[0],
          value: 1n,
          maxFeePerGas: 1_000_000_000n,
          maxPriorityFeePerGas: 1n,
          data: "0x",
          nonce: 0,
        });

        // The 1n comes from a bug in hardhat network
        assert.equal(estimation, 21_000n + 1n);
      });

      it("Should throw if the tx would not succeed", async function () {
        const { artifact, address } = await deployContract(this);

        await assert.isRejected(
          estimateGas(this.hre.network.provider, {
            to: address,
            from: this.accounts[0],
            data: encodeArtifactFunctionCall(
              artifact,
              "revertWithReasonMessage",
              []
            ),
            nonce: 0,
            maxFeePerGas: 1_000_000_000n,
            maxPriorityFeePerGas: 1n,
            value: 0n,
          })
        );
      });
    });

    describe("getTransactionCount", function () {
      it("`latest` should return the amount of confirmed transactions", async function () {
        let count = await getTransactionCount(
          this.hre.network.provider,
          this.accounts[0],
          "latest"
        );

        assert.equal(count, 0);

        await sendTransaction(this.hre.network.provider, {
          to: this.accounts[1],
          from: this.accounts[0],
          value: 1n,
          maxFeePerGas: 1_000_000_000n,
          maxPriorityFeePerGas: 1n,
          gasLimit: 21_000n,
          data: "0x",
          nonce: 0,
        });

        count = await getTransactionCount(
          this.hre.network.provider,
          this.accounts[0],
          "latest"
        );

        assert.equal(count, 1);

        await sendTransaction(this.hre.network.provider, {
          to: this.accounts[1],
          from: this.accounts[0],
          value: 1n,
          maxFeePerGas: 1_000_000_000n,
          maxPriorityFeePerGas: 1n,
          gasLimit: 21_000n,
          data: "0x",
          nonce: 1,
        });

        count = await getTransactionCount(
          this.hre.network.provider,
          this.accounts[0],
          "latest"
        );

        assert.equal(count, 2);
      });

      it("`pending` should return the amount of unconfirmed transactions", async function () {
        await this.hre.network.provider.send("evm_setAutomine", [false]);
        let latestCount = await getTransactionCount(
          this.hre.network.provider,
          this.accounts[0],
          "latest"
        );

        let pendingCount = await getTransactionCount(
          this.hre.network.provider,
          this.accounts[0],
          "pending"
        );

        assert.equal(latestCount, 0);
        assert.equal(pendingCount, 0);

        await sendTransaction(this.hre.network.provider, {
          to: this.accounts[1],
          from: this.accounts[0],
          value: 1n,
          maxFeePerGas: 1_000_000_000n,
          maxPriorityFeePerGas: 1n,
          gasLimit: 21_000n,
          data: "0x",
          nonce: 0,
        });

        latestCount = await getTransactionCount(
          this.hre.network.provider,
          this.accounts[0],
          "latest"
        );

        pendingCount = await getTransactionCount(
          this.hre.network.provider,
          this.accounts[0],
          "pending"
        );

        assert.equal(latestCount, 0);
        assert.equal(pendingCount, 1);

        await sendTransaction(this.hre.network.provider, {
          to: this.accounts[1],
          from: this.accounts[0],
          value: 1n,
          maxFeePerGas: 1_000_000_000n,
          maxPriorityFeePerGas: 1n,
          gasLimit: 21_000n,
          data: "0x",
          nonce: 1,
        });

        latestCount = await getTransactionCount(
          this.hre.network.provider,
          this.accounts[0],
          "latest"
        );

        pendingCount = await getTransactionCount(
          this.hre.network.provider,
          this.accounts[0],
          "pending"
        );

        assert.equal(latestCount, 0);
        assert.equal(pendingCount, 2);
      });

      it("using a number should return the amount of confirmed transactions up to and including that block", async function () {
        await sendTransaction(this.hre.network.provider, {
          to: this.accounts[1],
          from: this.accounts[0],
          value: 1n,
          maxFeePerGas: 1_000_000_000n,
          maxPriorityFeePerGas: 1n,
          gasLimit: 21_000n,
          data: "0x",
          nonce: 0,
        });

        let latestCount = await getTransactionCount(
          this.hre.network.provider,
          this.accounts[0],
          "latest"
        );

        let blockOneCount = await getTransactionCount(
          this.hre.network.provider,
          this.accounts[0],
          1
        );

        assert.equal(latestCount, 1);
        assert.equal(blockOneCount, 1);

        await sendTransaction(this.hre.network.provider, {
          to: this.accounts[1],
          from: this.accounts[0],
          value: 1n,
          maxFeePerGas: 1_000_000_000n,
          maxPriorityFeePerGas: 1n,
          gasLimit: 21_000n,
          data: "0x",
          nonce: 1,
        });

        latestCount = await getTransactionCount(
          this.hre.network.provider,
          this.accounts[0],
          "latest"
        );

        blockOneCount = await getTransactionCount(
          this.hre.network.provider,
          this.accounts[0],
          1
        );

        assert.equal(latestCount, 2);
        assert.equal(blockOneCount, 1);
      });
    });

    describe("getTransaction", function () {
      describe("Confirmed transactions", function () {
        it("Should return its hash, network fees, blockNumber and blockHash", async function () {
          const req = {
            to: this.accounts[1],
            from: this.accounts[0],
            value: 1n,
            maxFeePerGas: 1_000_000_000n,
            maxPriorityFeePerGas: 1n,
            gasLimit: 21_000n,
            data: "0x",
            nonce: 0,
          };

          const hash = await sendTransaction(this.hre.network.provider, req);

          const tx = await getTransaction(this.hre.network.provider, hash);
          const block = await getLatestBlock(this.hre.network.provider);

          assert.isDefined(tx);

          assert.equal(tx!.hash, hash);
          assert.equal(tx!.blockNumber, block.number);
          assert.equal(tx!.blockHash, block.hash);
          assert.equal(tx!.maxFeePerGas, req.maxFeePerGas);
          assert.equal(tx!.maxPriorityFeePerGas, req.maxPriorityFeePerGas);
        });
      });

      describe("Pending transactions", function () {
        it("Should the tx if it is in the mempool", async function () {
          await this.hre.network.provider.send("evm_setAutomine", [false]);

          const req = {
            to: this.accounts[1],
            from: this.accounts[0],
            value: 1n,
            maxFeePerGas: 1_000_000_000n,
            maxPriorityFeePerGas: 1n,
            gasLimit: 21_000n,
            data: "0x",
            nonce: 0,
          };

          const hash = await sendTransaction(this.hre.network.provider, req);

          const tx = await getTransaction(this.hre.network.provider, hash);

          assert.isDefined(tx);
          assert.equal(tx!.hash, hash);
          assert.isUndefined(tx!.blockNumber);
          assert.isUndefined(tx!.blockHash);
          assert.equal(tx!.maxFeePerGas, req.maxFeePerGas);
          assert.equal(tx!.maxPriorityFeePerGas, req.maxPriorityFeePerGas);
        });

        it("Should return undefined if the transaction was never sent", async function () {
          const tx = await getTransaction(
            this.hre.network.provider,
            "0x0000000000000000000000000000000000000000000000000000000000000001"
          );

          assert.isUndefined(tx);
        });

        it("Should return undefined if the transaction was replaced by a different one", async function () {
          await this.hre.network.provider.send("evm_setAutomine", [false]);

          const firstReq = {
            to: this.accounts[1],
            from: this.accounts[0],
            value: 1n,
            maxFeePerGas: 1_000_000_000n,
            maxPriorityFeePerGas: 1n,
            gasLimit: 21_000n,
            data: "0x",
            nonce: 0,
          };

          const firstTxHash = await sendTransaction(
            this.hre.network.provider,
            firstReq
          );

          const secondReq = {
            ...firstReq,
            maxFeePerGas: 2_000_000_000n,
            maxPriorityFeePerGas: 2n,
          };

          await sendTransaction(this.hre.network.provider, secondReq);

          const tx = await getTransaction(
            this.hre.network.provider,
            firstTxHash
          );

          assert.isUndefined(tx);
        });

        it("Should return undefined if the transaction was dropped", async function () {
          await this.hre.network.provider.send("evm_setAutomine", [false]);

          const txHash = await sendTransaction(this.hre.network.provider, {
            to: this.accounts[1],
            from: this.accounts[0],
            value: 1n,
            maxFeePerGas: 1_000_000_000n,
            maxPriorityFeePerGas: 1n,
            gasLimit: 21_000n,
            data: "0x",
            nonce: 0,
          });

          await this.hre.network.provider.send("hardhat_dropTransaction", [
            txHash,
          ]);

          const tx = await getTransaction(this.hre.network.provider, txHash);

          assert.isUndefined(tx);
        });
      });
    });

    describe("getTransactionReceipt", function () {
      describe("Confirmed transactions", function () {
        it("Should return the receipt if the transaction was successful", async function () {
          const hash = await sendTransaction(this.hre.network.provider, {
            to: this.accounts[1],
            from: this.accounts[0],
            value: 1n,
            maxFeePerGas: 1_000_000_000n,
            maxPriorityFeePerGas: 1n,
            gasLimit: 21_000n,
            data: "0x",
            nonce: 0,
          });

          const block = await getLatestBlock(this.hre.network.provider);

          const receipt = await getTransactionReceipt(
            this.hre.network.provider,
            hash
          );

          assert.isDefined(receipt);
          assert.equal(receipt!.blockHash, block.hash);
          assert.equal(receipt!.blockNumber, block.number);
          assert.equal(receipt!.status, TransactionReceiptStatus.SUCCESS);
          assert.isUndefined(receipt!.contractAddress);
          assert.deepEqual(receipt!.logs, []);
        });

        it("Should return the contract address for successful deployment transactions", async function () {
          const artifact = await this.hre.artifacts.readArtifact("C");
          const hash = await sendTransaction(this.hre.network.provider, {
            from: this.accounts[0],
            value: 0n,
            maxFeePerGas: 1_000_000_000n,
            maxPriorityFeePerGas: 1n,
            gasLimit: 1_000_000n,
            data: await encodeArtifactDeploymentData(artifact, [], {}),
            nonce: 0,
          });

          const block = await getLatestBlock(this.hre.network.provider);

          const receipt = await getTransactionReceipt(
            this.hre.network.provider,
            hash
          );

          assert.isDefined(receipt);
          assert.equal(receipt!.blockHash, block.hash);
          assert.equal(receipt!.blockNumber, block.number);
          assert.equal(receipt!.status, TransactionReceiptStatus.SUCCESS);
          assert.isDefined(receipt!.contractAddress);
          assert.deepEqual(receipt!.logs, []);
        });

        it("Should return the receipt for reverted transactions", async function () {
          const hash = await sendTransaction(this.hre.network.provider, {
            data: "0x1234123120",
            value: 0n,
            from: this.accounts[0],
            nonce: 0,
            gasLimit: 5_000_000n,
            maxFeePerGas: 1_000_000_000n,
            maxPriorityFeePerGas: 1n,
          });

          const block = await getLatestBlock(this.hre.network.provider);

          const receipt = await getTransactionReceipt(
            this.hre.network.provider,
            hash
          );

          assert.isDefined(receipt);
          assert.equal(receipt!.blockHash, block.hash);
          assert.equal(receipt!.blockNumber, block.number);
          assert.equal(receipt!.status, TransactionReceiptStatus.FAILURE);
          assert.isUndefined(receipt!.contractAddress);
          assert.deepEqual(receipt!.logs, []);
        });

        it("Should return the right logs", async function () {
          const { artifact, address } = await deployContract(this);
          const hash = await sendTransaction(this.hre.network.provider, {
            to: address,
            data: encodeArtifactFunctionCall(artifact, "events", []),
            value: 0n,
            from: this.accounts[0],
            nonce: 1,
            gasLimit: 5_000_000n,
            maxFeePerGas: 1_000_000_000n,
            maxPriorityFeePerGas: 1n,
          });

          const block = await getLatestBlock(this.hre.network.provider);

          const receipt = await getTransactionReceipt(
            this.hre.network.provider,
            hash
          );

          assert.isDefined(receipt);
          assert.equal(receipt!.blockHash, block.hash);
          assert.equal(receipt!.blockNumber, block.number);
          assert.equal(receipt!.status, TransactionReceiptStatus.SUCCESS);
          assert.isUndefined(receipt!.contractAddress);

          assert.isArray(receipt!.logs);
          assert.lengthOf(receipt!.logs, 2);

          const event0 = receipt!.logs[0];
          const event1 = receipt!.logs[1];

          assert.equal(event0.address, address);
          assert.notEqual(event1.address, address);

          assert.equal(event0.logIndex, 0);
          assert.equal(event1.logIndex, 1);

          assert.notEqual(event0.data, "0x");
          assert.notEqual(event1.data, "0x");

          assert.isDefined(event0.topics[0]);
          assert.notEqual(event0.topics[0], "0x");

          assert.isDefined(event1.topics[0]);
          assert.notEqual(event1.topics[0], "0x");

          assert.notEqual(event0.topics[0], event1.topics[0]);
        });
      });

      describe("Pending transactions", function () {
        it("Should return undefined if the transaction is in the mempool", async function () {
          await this.hre.network.provider.send("evm_setAutomine", [false]);

          const hash = await sendTransaction(this.hre.network.provider, {
            to: this.accounts[1],
            from: this.accounts[0],
            value: 1n,
            maxFeePerGas: 1_000_000_000n,
            maxPriorityFeePerGas: 1n,
            gasLimit: 21_000n,
            data: "0x",
            nonce: 0,
          });

          const receipt = await getTransactionReceipt(
            this.hre.network.provider,
            hash
          );

          assert.isUndefined(receipt);
        });

        it("Should return undefined if the transaction was never sent", async function () {
          const receipt = await getTransactionReceipt(
            this.hre.network.provider,
            "0x0000000000000000000000000000000000000000000000000000000000000001"
          );

          assert.isUndefined(receipt);
        });

        it("Should return undefined if the transaction was replaced by a different one", async function () {
          await this.hre.network.provider.send("evm_setAutomine", [false]);

          const firstReq = {
            to: this.accounts[1],
            from: this.accounts[0],
            value: 1n,
            maxFeePerGas: 1_000_000_000n,
            maxPriorityFeePerGas: 1n,
            gasLimit: 21_000n,
            data: "0x",
            nonce: 0,
          };

          const firstTxHash = await sendTransaction(
            this.hre.network.provider,
            firstReq
          );

          const secondReq = {
            ...firstReq,
            maxFeePerGas: 2_000_000_000n,
            maxPriorityFeePerGas: 2n,
          };

          await sendTransaction(this.hre.network.provider, secondReq);

          const receipt = await getTransactionReceipt(
            this.hre.network.provider,
            firstTxHash
          );

          assert.isUndefined(receipt);
        });

        it("Should return undefined if the transaction was dropped", async function () {
          await this.hre.network.provider.send("evm_setAutomine", [false]);

          const txHash = await sendTransaction(this.hre.network.provider, {
            to: this.accounts[1],
            from: this.accounts[0],
            value: 1n,
            maxFeePerGas: 1_000_000_000n,
            maxPriorityFeePerGas: 1n,
            gasLimit: 21_000n,
            data: "0x",
            nonce: 0,
          });

          await this.hre.network.provider.send("hardhat_dropTransaction", [
            txHash,
          ]);

          const receipt = await getTransactionReceipt(
            this.hre.network.provider,
            txHash
          );

          assert.isUndefined(receipt);
        });
      });
    });
  });

  describe("With a hardhat network that doesn't throw on transaction errors", function () {
    useHardhatProject("dont-throw-on-reverts");

    describe("sendTransaction", function () {
      it("Should return the tx hash, even on execution failures", async function () {
        // We send an invalid deployment transaction
        const result = await sendTransaction(this.hre.network.provider, {
          data: "0x1234123120",
          value: 0n,
          from: this.accounts[0],
          nonce: 0,
          gasLimit: 5_000_000n,
          maxFeePerGas: 1_000_000_000n,
          maxPriorityFeePerGas: 1n,
        });

        assert.isString(result);
      });
    });
  });
});
