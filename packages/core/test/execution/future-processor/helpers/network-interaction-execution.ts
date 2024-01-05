import { assert } from "chai";

import {
  GetTransactionRetryConfig,
  monitorOnchainInteraction,
} from "../../../../src/internal/execution/future-processor/handlers/monitor-onchain-interaction";
import { runStaticCall } from "../../../../src/internal/execution/future-processor/helpers/network-interaction-execution";
import {
  Block,
  CallParams,
  EstimateGasParams,
  JsonRpcClient,
  TransactionParams,
} from "../../../../src/internal/execution/jsonrpc-client";
import { TransactionTrackingTimer } from "../../../../src/internal/execution/transaction-tracking-timer";
import {
  DeploymentExecutionState,
  ExecutionSateType,
  ExecutionStatus,
} from "../../../../src/internal/execution/types/execution-state";
import {
  NetworkFees,
  RawStaticCallResult,
  Transaction,
  TransactionReceipt,
  TransactionReceiptStatus,
} from "../../../../src/internal/execution/types/jsonrpc";
import { JournalMessageType } from "../../../../src/internal/execution/types/messages";
import {
  NetworkInteractionType,
  StaticCall,
} from "../../../../src/internal/execution/types/network-interaction";
import { FutureType } from "../../../../src/types/module";
import { exampleAccounts } from "../../../helpers";

class StubJsonRpcClient implements JsonRpcClient {
  public async getChainId(): Promise<number> {
    throw new Error("Mock not implemented.");
  }

  public async getNetworkFees(): Promise<NetworkFees> {
    throw new Error("Mock not implemented.");
  }

  public async getLatestBlock(): Promise<Block> {
    throw new Error("Mock not implemented.");
  }

  public async getBalance(
    _address: string,
    _blockTag: "latest" | "pending"
  ): Promise<bigint> {
    throw new Error("Mock not implemented.");
  }

  public async call(
    _callParams: CallParams,
    _blockTag: "latest" | "pending"
  ): Promise<RawStaticCallResult> {
    throw new Error("Mock not implemented.");
  }

  public async estimateGas(
    _transactionParams: EstimateGasParams
  ): Promise<bigint> {
    throw new Error("Mock not implemented.");
  }

  public async sendTransaction(
    _transactionParams: TransactionParams
  ): Promise<string> {
    throw new Error("Mock not implemented.");
  }

  public async getTransactionCount(
    _address: string,
    _blockTag: number | "latest" | "pending"
  ): Promise<number> {
    throw new Error("Mock not implemented.");
  }

  public async getTransaction(
    _txHash: string
  ): Promise<Omit<Transaction, "receipt"> | undefined> {
    throw new Error("Mock not implemented.");
  }

  public async getTransactionReceipt(
    _txHash: string
  ): Promise<TransactionReceipt | undefined> {
    throw new Error("Mock not implemented.");
  }
}

describe("Network interactions", () => {
  describe("runStaticCall", () => {
    it("Should run the static call as latest and return the result", async () => {
      const staticCall: StaticCall = {
        from: "0x123",
        to: "0x456",
        data: "0x789",
        value: 8n,
        id: 1,
        type: NetworkInteractionType.STATIC_CALL,
      };

      const expectedResult: RawStaticCallResult = {
        customErrorReported: true,
        returnData: "0x1234",
        success: false,
      };

      class MockJsonRpcClient extends StubJsonRpcClient {
        public calls: number = 0;

        public async call(
          callParams: CallParams,
          blockTag: "latest" | "pending"
        ): Promise<RawStaticCallResult> {
          this.calls += 1;
          assert.equal(callParams.from, staticCall.from);
          assert.equal(callParams.to, staticCall.to);
          assert.equal(callParams.data, staticCall.data);
          assert.equal(callParams.value, staticCall.value);
          assert.isUndefined(callParams.fees);
          assert.isUndefined(callParams.nonce);
          assert.equal(blockTag, "latest");

          return expectedResult;
        }
      }

      const mockClient = new MockJsonRpcClient();
      const result = await runStaticCall(mockClient, staticCall);
      assert.equal(result, expectedResult);
      assert.equal(mockClient.calls, 1);
    });
  });

  describe("monitorOnchainInteraction", () => {
    const requiredConfirmations = 1;
    const millisecondBeforeBumpingFees = 1;
    const maxFeeBumps = 1;

    const testGetTransactionRetryConfig: GetTransactionRetryConfig = {
      maxRetries: 10,
      retryInterval: 1,
    };

    let mockClient: MockGetTransactionJsonRpcClient;
    let fakeTransactionTrackingTimer: FakeTransactionTrackingTimer;

    const exampleDeploymentExecutionState: DeploymentExecutionState = {
      id: "test",
      type: ExecutionSateType.DEPLOYMENT_EXECUTION_STATE,
      futureType: FutureType.NAMED_ARTIFACT_CONTRACT_DEPLOYMENT,
      strategy: "basic",
      status: ExecutionStatus.STARTED,
      dependencies: new Set<string>(),
      artifactId: "./artifact.json",
      contractName: "Contract1",
      value: 0n,
      constructorArgs: [],
      libraries: {},
      from: exampleAccounts[0],
      networkInteractions: [],
    };

    beforeEach(() => {
      mockClient = new MockGetTransactionJsonRpcClient();
      fakeTransactionTrackingTimer = new FakeTransactionTrackingTimer();
    });

    it("Should succeed even if transaction takes time to propagate to the mempool", async () => {
      const deploymentExecutionState: DeploymentExecutionState = {
        ...exampleDeploymentExecutionState,
        networkInteractions: [
          {
            id: 1,
            type: NetworkInteractionType.ONCHAIN_INTERACTION,
            to: exampleAccounts[1],
            value: 0n,
            data: "0x",
            shouldBeResent: true,
            transactions: [
              {
                hash: "0x1234",
                fees: {
                  maxFeePerGas: 0n,
                  maxPriorityFeePerGas: 0n,
                },
              },
            ],
          },
        ],
      };

      mockClient.callToFindResult = 4;
      mockClient.result = {
        hash: "0x1234",
        fees: {
          maxFeePerGas: 0n,
          maxPriorityFeePerGas: 0n,
        },
      };

      const message = await monitorOnchainInteraction(
        deploymentExecutionState,
        mockClient,
        fakeTransactionTrackingTimer,
        requiredConfirmations,
        millisecondBeforeBumpingFees,
        maxFeeBumps,
        testGetTransactionRetryConfig
      );

      if (message === undefined) {
        return assert.fail("No message returned from monitoring");
      }

      assert.isDefined(message);
      assert.equal(message.type, JournalMessageType.TRANSACTION_CONFIRM);
      assert.equal(message.futureId, deploymentExecutionState.id);
    });

    it("Should error when no transaction in the mempool even after awaiting propagation", async () => {
      const deploymentExecutionState: DeploymentExecutionState = {
        ...exampleDeploymentExecutionState,
        networkInteractions: [
          {
            id: 1,
            type: NetworkInteractionType.ONCHAIN_INTERACTION,
            to: exampleAccounts[1],
            value: 0n,
            data: "0x",
            shouldBeResent: true,
            transactions: [
              {
                hash: "0x1234",
                fees: {
                  maxFeePerGas: 0n,
                  maxPriorityFeePerGas: 0n,
                },
              },
            ],
          },
        ],
      };

      await assert.isRejected(
        monitorOnchainInteraction(
          deploymentExecutionState,
          mockClient,
          fakeTransactionTrackingTimer,
          requiredConfirmations,
          millisecondBeforeBumpingFees,
          maxFeeBumps,
          testGetTransactionRetryConfig
        ),
        /IGN401: Error while executing test: all the transactions of its network interaction 1 were dropped\. Please try rerunning Hardhat Ignition\./
      );

      assert.equal(mockClient.calls, 10);
    });
  });

  describe("sendTransactionForOnchainInteraction", () => {
    describe("First transaction", () => {
      it("Should allocate a nonce for the onchain interaction's sender", async () => {
        // TODO @alcuadrado
      });

      it("Should use the recommended network fees", async () => {
        // TODO @alcuadrado
      });

      describe("When the gas estimation succeeds", () => {
        describe("When the simulation fails", () => {
          it("Should return the decoded simulation error", async () => {
            // TODO @alcuadrado
          });
        });

        describe("When the simulation succeeds", () => {
          it("Should send the transaction and return its hash and nonce", async () => {
            // TODO @alcuadrado
          });
        });
      });

      describe("When the gas estimation fails", () => {
        describe("When the simulation fails", () => {
          it("Should return the decoded simulation error", async () => {
            // TODO @alcuadrado
          });
        });

        describe("When the simulation succeeds", () => {
          it("Should hit an invariant violation", async () => {
            // TODO @alcuadrado
          });
        });
      });
    });

    describe("Follow up transaction", () => {
      it("Should reuse the nonce that the onchain interaction has, and not allocate a new one", async () => {
        // TODO @alcuadrado
      });

      it("Should bump fees and also take recommended network fees into account", async () => {
        // TODO @alcuadrado
      });

      it("Should re-estimate the gas limit", async () => {
        // TODO @alcuadrado
      });

      it("Should run a new simulation", async () => {
        // TODO @alcuadrado
      });
    });
  });
});

class MockGetTransactionJsonRpcClient extends StubJsonRpcClient {
  public calls: number = 0;
  public callToFindResult: number = Number.MAX_SAFE_INTEGER;
  public result: Omit<Transaction, "receipt"> | undefined = undefined;

  public async getTransaction(
    _txHash: string
  ): Promise<Omit<Transaction, "receipt"> | undefined> {
    if (this.calls === this.callToFindResult) {
      return this.result;
    }

    this.calls += 1;

    return undefined;
  }

  public async getLatestBlock(): Promise<Block> {
    return {
      hash: "0xblockhas",
      number: 34,
    };
  }

  public async getTransactionReceipt(
    _txHash: string
  ): Promise<TransactionReceipt | undefined> {
    return {
      blockHash: "0xblockhash",
      blockNumber: 34,
      contractAddress: "0xcontractaddress",
      logs: [],
      status: TransactionReceiptStatus.SUCCESS,
    };
  }
}

class FakeTransactionTrackingTimer extends TransactionTrackingTimer {
  public getTransactionTrackingTime(_txHash: string): number {
    return 0;
  }
}
