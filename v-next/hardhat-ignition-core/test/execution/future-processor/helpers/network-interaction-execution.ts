import type { DeploymentLoader } from "../../../../src/internal/deployment-loader/types.js";
import type {
  Block,
  CallParams,
  EstimateGasParams,
  JsonRpcClient,
  TransactionParams,
} from "../../../../src/internal/execution/jsonrpc-client.js";
import type { NonceManager } from "../../../../src/internal/execution/nonce-management/json-rpc-nonce-manager.js";
import type { SimulationErrorExecutionResult } from "../../../../src/internal/execution/types/execution-result.js";
import type {
  CallExecutionState,
  DeploymentExecutionState,
} from "../../../../src/internal/execution/types/execution-state.js";
import type { CallStrategyGenerator } from "../../../../src/internal/execution/types/execution-strategy.js";
import type {
  EIP1559NetworkFees,
  NetworkFees,
  RawStaticCallResult,
  Transaction,
  TransactionReceipt,
} from "../../../../src/internal/execution/types/jsonrpc.js";
import type { JournalMessage } from "../../../../src/internal/execution/types/messages.js";
import type {
  OnchainInteraction,
  StaticCall,
} from "../../../../src/internal/execution/types/network-interaction.js";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import { assertRejectsWithHardhatError } from "@nomicfoundation/hardhat-test-utils";
import { assert } from "chai";

import { monitorOnchainInteraction } from "../../../../src/internal/execution/future-processor/handlers/monitor-onchain-interaction.js";
import { decodeSimulationResult } from "../../../../src/internal/execution/future-processor/helpers/decode-simulation-result.js";
import {
  TRANSACTION_SENT_TYPE,
  runStaticCall,
  sendTransactionForOnchainInteraction,
} from "../../../../src/internal/execution/future-processor/helpers/network-interaction-execution.js";
import { TransactionTrackingTimer } from "../../../../src/internal/execution/transaction-tracking-timer.js";
import { EvmExecutionResultTypes } from "../../../../src/internal/execution/types/evm-execution.js";
import { ExecutionResultType } from "../../../../src/internal/execution/types/execution-result.js";
import {
  ExecutionSateType,
  ExecutionStatus,
} from "../../../../src/internal/execution/types/execution-state.js";
import { TransactionReceiptStatus } from "../../../../src/internal/execution/types/jsonrpc.js";
import { JournalMessageType } from "../../../../src/internal/execution/types/messages.js";
import { NetworkInteractionType } from "../../../../src/internal/execution/types/network-interaction.js";
import { FutureType } from "../../../../src/types/module.js";
import { exampleAccounts } from "../../../helpers.js";

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
    _blockTag: "latest" | "pending",
  ): Promise<bigint> {
    throw new Error("Mock not implemented.");
  }

  public async setBalance(
    _address: string,
    _balance: bigint,
  ): Promise<boolean> {
    throw new Error("Mock not implemented.");
  }

  public async call(
    _callParams: CallParams,
    _blockTag: "latest" | "pending",
  ): Promise<RawStaticCallResult> {
    throw new Error("Mock not implemented.");
  }

  public async estimateGas(
    _transactionParams: EstimateGasParams,
  ): Promise<bigint> {
    throw new Error("Mock not implemented.");
  }

  public async sendTransaction(
    _transactionParams: TransactionParams,
  ): Promise<string> {
    throw new Error("Mock not implemented.");
  }

  public async sendRawTransaction(_presignedTx: string): Promise<string> {
    throw new Error("Method not implemented.");
  }

  public async getTransactionCount(
    _address: string,
    _blockTag: number | "latest" | "pending",
  ): Promise<number> {
    throw new Error("Mock not implemented.");
  }

  public async getTransaction(
    _txHash: string,
  ): Promise<Omit<Transaction, "receipt"> | undefined> {
    throw new Error("Mock not implemented.");
  }

  public async getTransactionReceipt(
    _txHash: string,
  ): Promise<TransactionReceipt | undefined> {
    throw new Error("Mock not implemented.");
  }

  public async getCode(_address: string): Promise<string> {
    throw new Error("Method not implemented.");
  }
}

class StubDeploymentLoader implements DeploymentLoader {
  public async recordToJournal(_message: JournalMessage): Promise<void> {
    throw new Error("Method not implemented.");
  }

  public async *readFromJournal(): AsyncGenerator<JournalMessage, any, any> {
    throw new Error("Method not implemented.");
  }

  public async loadArtifact(_artifactId: string): Promise<any> {
    throw new Error("Method not implemented.");
  }

  public async storeUserProvidedArtifact(
    _futureId: string,
    _artifact: any,
  ): Promise<void> {
    throw new Error("Method not implemented.");
  }

  public async storeNamedArtifact(
    _futureId: string,
    _contractName: string,
    _artifact: any,
  ): Promise<void> {
    throw new Error("Method not implemented.");
  }

  public async storeBuildInfo(
    _futureId: string,
    _buildInfo: any,
  ): Promise<void> {
    throw new Error("Method not implemented.");
  }

  public async recordDeployedAddress(
    _futureId: string,
    _contractAddress: string,
  ): Promise<void> {
    throw new Error("Method not implemented.");
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

        public override async call(
          callParams: CallParams,
          blockTag: "latest" | "pending",
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

    let mockClient: MockGetTransactionJsonRpcClient;
    let fakeTransactionTrackingTimer: FakeTransactionTrackingTimer;

    const exampleDeploymentExecutionState: DeploymentExecutionState = {
      id: "test",
      type: ExecutionSateType.DEPLOYMENT_EXECUTION_STATE,
      futureType: FutureType.NAMED_ARTIFACT_CONTRACT_DEPLOYMENT,
      strategy: "basic",
      strategyConfig: {},
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

      const message = await monitorOnchainInteraction({
        exState: deploymentExecutionState,
        jsonRpcClient: mockClient,
        transactionTrackingTimer: fakeTransactionTrackingTimer,
        requiredConfirmations,
        millisecondBeforeBumpingFees,
        maxFeeBumps,
        disableFeeBumping: false,
        maxRetries: 10,
        retryInterval: 1,
      });

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

      await assertRejectsWithHardhatError(
        monitorOnchainInteraction({
          exState: deploymentExecutionState,
          jsonRpcClient: mockClient,
          transactionTrackingTimer: fakeTransactionTrackingTimer,
          requiredConfirmations,
          millisecondBeforeBumpingFees,
          maxFeeBumps,
          disableFeeBumping: false,
          maxRetries: 10,
          retryInterval: 1,
        }),
        HardhatError.ERRORS.IGNITION.EXECUTION.DROPPED_TRANSACTION,
        {
          futureId: "test",
          networkInteractionId: 1,
        },
      );

      assert.equal(mockClient.calls, 10);
    });
  });

  describe("sendTransactionForOnchainInteraction", () => {
    describe("First transaction", () => {
      class MockJsonRpcClient extends StubJsonRpcClient {
        public override async getNetworkFees(): Promise<NetworkFees> {
          return {
            maxFeePerGas: 0n,
            maxPriorityFeePerGas: 0n,
          };
        }

        public override async estimateGas(
          _transactionParams: EstimateGasParams,
        ): Promise<bigint> {
          return 0n;
        }

        public override async call(
          _callParams: CallParams,
          _blockTag: "latest" | "pending",
        ): Promise<RawStaticCallResult> {
          return {
            customErrorReported: false,
            returnData: "0x",
            success: true,
          };
        }

        public override async sendTransaction(
          _transactionParams: TransactionParams,
        ): Promise<string> {
          return "0x1234";
        }
      }

      class MockNonceManager implements NonceManager {
        public calls: Record<string, number> = {};

        public async getNextNonce(_address: string): Promise<number> {
          this.calls[_address] = this.calls[_address] ?? 0;
          this.calls[_address] += 1;
          return this.calls[_address] - 1;
        }

        public revertNonce(_sender: string): void {
          throw new Error("Method not implemented.");
        }
      }

      class MockDeploymentLoader extends StubDeploymentLoader {
        public message: JournalMessage | undefined;

        public override async recordToJournal(
          _message: JournalMessage,
        ): Promise<void> {
          this.message = _message;
        }
      }

      it("Should use the recommended network fees", async () => {
        class LocalMockJsonRpcClient extends MockJsonRpcClient {
          // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- just for mock
          public storedFees: EIP1559NetworkFees = {} as EIP1559NetworkFees;

          public override async getNetworkFees(): Promise<NetworkFees> {
            return {
              maxFeePerGas: 100n,
              maxPriorityFeePerGas: 50n,
            };
          }

          public override async sendTransaction(
            _transactionParams: TransactionParams,
          ): Promise<string> {
            // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- just for mock
            this.storedFees = _transactionParams.fees as EIP1559NetworkFees;
            return "0x1234";
          }
        }

        const client = new LocalMockJsonRpcClient();
        const nonceManager = new MockNonceManager();
        const deploymentLoader = new MockDeploymentLoader();

        const onchainInteraction: OnchainInteraction = {
          to: exampleAccounts[1],
          data: "0x",
          value: 0n,
          id: 1,
          type: NetworkInteractionType.ONCHAIN_INTERACTION,
          transactions: [],
          shouldBeResent: false,
        };

        await sendTransactionForOnchainInteraction(
          client,
          exampleAccounts[0],
          onchainInteraction,
          nonceManager,
          async () => undefined,
          deploymentLoader,
          "test",
        );

        assert.equal(client.storedFees.maxFeePerGas, 100n);
        assert.equal(client.storedFees.maxPriorityFeePerGas, 50n);
      });

      describe("When allocating a nonce", () => {
        it("Should allocate a nonce when the onchainInteraction doesn't have one", async () => {
          const client = new MockJsonRpcClient();
          const nonceManager = new MockNonceManager();
          const deploymentLoader = new MockDeploymentLoader();

          const onchainInteraction: OnchainInteraction = {
            to: exampleAccounts[1],
            data: "0x",
            value: 0n,
            id: 1,
            type: NetworkInteractionType.ONCHAIN_INTERACTION,
            transactions: [],
            shouldBeResent: false,
          };

          await sendTransactionForOnchainInteraction(
            client,
            exampleAccounts[0],
            onchainInteraction,
            nonceManager,
            async () => undefined,
            deploymentLoader,
            "test",
          );

          assert.equal(nonceManager.calls[exampleAccounts[0]], 1);
        });

        it("Should use the onchainInteraction nonce if present", async () => {
          class LocalMockJsonRpcClient extends MockJsonRpcClient {
            public storedNonce: number | undefined;

            public override async sendTransaction(
              _transactionParams: TransactionParams,
            ): Promise<string> {
              this.storedNonce = _transactionParams.nonce;
              return "0x1234";
            }
          }

          const client = new LocalMockJsonRpcClient();
          const nonceManager = new MockNonceManager();
          const deploymentLoader = new MockDeploymentLoader();

          const onchainInteraction: OnchainInteraction = {
            to: exampleAccounts[1],
            data: "0x",
            value: 0n,
            nonce: 5,
            id: 1,
            type: NetworkInteractionType.ONCHAIN_INTERACTION,
            transactions: [],
            shouldBeResent: false,
          };

          await sendTransactionForOnchainInteraction(
            client,
            exampleAccounts[0],
            onchainInteraction,
            nonceManager,
            async () => undefined,
            deploymentLoader,
            "test",
          );

          assert.equal(nonceManager.calls[exampleAccounts[0]], undefined);
          assert.equal(client.storedNonce, 5);
        });
      });

      describe("When the gas estimation succeeds", () => {
        describe("When the simulation fails", () => {
          it("Should return the decoded simulation error", async () => {
            class LocalMockJsonRpcClient extends MockJsonRpcClient {
              public override async call(
                _callParams: CallParams,
                _blockTag: "latest" | "pending",
              ): Promise<RawStaticCallResult> {
                return {
                  customErrorReported: true,
                  returnData: "0x1111",
                  success: false,
                };
              }
            }

            const client = new LocalMockJsonRpcClient();
            const nonceManager = new MockNonceManager();
            const deploymentLoader = new MockDeploymentLoader();

            const onchainInteraction: OnchainInteraction = {
              to: exampleAccounts[1],
              data: "0x",
              value: 0n,
              id: 1,
              type: NetworkInteractionType.ONCHAIN_INTERACTION,
              transactions: [],
              shouldBeResent: false,
            };

            // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- just for mock
            const mockStrategyGenerator = {
              next(): { value: SimulationErrorExecutionResult } {
                return {
                  value: {
                    type: ExecutionResultType.SIMULATION_ERROR,
                    error: {
                      type: EvmExecutionResultTypes.REVERT_WITH_REASON,
                      message: "mock error",
                    },
                  },
                };
              },
            } as unknown as CallStrategyGenerator;

            // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- just for mock
            const mockExecutionState = {
              id: "test",
            } as unknown as CallExecutionState;

            const result = await sendTransactionForOnchainInteraction(
              client,
              exampleAccounts[0],
              onchainInteraction,
              nonceManager,
              decodeSimulationResult(mockStrategyGenerator, mockExecutionState),
              deploymentLoader,
              "test",
            );

            // type casting
            if (
              result.type !== ExecutionResultType.SIMULATION_ERROR ||
              result.error.type !== EvmExecutionResultTypes.REVERT_WITH_REASON
            ) {
              return assert.fail("Unexpected result type");
            }

            assert.equal(result.error.message, "mock error");
          });
        });

        describe("When the simulation succeeds", () => {
          it("Should write a TRANSACTION_PREPARE_SEND message to the journal, then send the transaction and return its hash and nonce", async () => {
            const client = new MockJsonRpcClient();
            const nonceManager = new MockNonceManager();
            const deploymentLoader = new MockDeploymentLoader();

            const onchainInteraction: OnchainInteraction = {
              to: exampleAccounts[1],
              data: "0x",
              value: 0n,
              id: 1,
              type: NetworkInteractionType.ONCHAIN_INTERACTION,
              transactions: [],
              shouldBeResent: false,
            };

            const result = await sendTransactionForOnchainInteraction(
              client,
              exampleAccounts[0],
              onchainInteraction,
              nonceManager,
              async () => undefined,
              deploymentLoader,
              "test",
            );

            // type casting
            if (result.type !== TRANSACTION_SENT_TYPE) {
              return assert.fail("Unexpected result type");
            }

            assert.equal(
              deploymentLoader.message?.type,
              JournalMessageType.TRANSACTION_PREPARE_SEND,
            );
            assert.equal(result.nonce, 0);
            assert.equal(result.transaction.hash, "0x1234");
          });
        });
      });

      describe("When the gas estimation fails", () => {
        class LocalMockJsonRpcClient extends MockJsonRpcClient {
          public errorMessage: string = "testing failure case";

          constructor(_errorMessage?: string) {
            super();
            this.errorMessage = _errorMessage ?? this.errorMessage;
          }

          public override async estimateGas(
            _transactionParams: EstimateGasParams,
          ): Promise<bigint> {
            throw new Error(this.errorMessage);
          }

          public override async call(
            _callParams: CallParams,
            _blockTag: "latest" | "pending",
          ): Promise<RawStaticCallResult> {
            return {
              customErrorReported: true,
              returnData: "0x1111",
              success: false,
            };
          }
        }

        describe("When the simulation fails", () => {
          it("Should return the decoded simulation error", async () => {
            const client = new LocalMockJsonRpcClient();
            const nonceManager = new MockNonceManager();
            const deploymentLoader = new MockDeploymentLoader();

            const onchainInteraction: OnchainInteraction = {
              to: exampleAccounts[1],
              data: "0x",
              value: 0n,
              id: 1,
              type: NetworkInteractionType.ONCHAIN_INTERACTION,
              transactions: [],
              shouldBeResent: false,
            };

            // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- just for mock
            const mockStrategyGenerator = {
              next(): { value: SimulationErrorExecutionResult } {
                return {
                  value: {
                    type: ExecutionResultType.SIMULATION_ERROR,
                    error: {
                      type: EvmExecutionResultTypes.REVERT_WITH_REASON,
                      message: "mock error",
                    },
                  },
                };
              },
            } as unknown as CallStrategyGenerator;

            // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- just for mock
            const mockExecutionState = {
              id: "test",
            } as unknown as CallExecutionState;

            const result = await sendTransactionForOnchainInteraction(
              client,
              exampleAccounts[0],
              onchainInteraction,
              nonceManager,
              decodeSimulationResult(mockStrategyGenerator, mockExecutionState),
              deploymentLoader,
              "test",
            );

            // type casting
            if (
              result.type !== ExecutionResultType.SIMULATION_ERROR ||
              result.error.type !== EvmExecutionResultTypes.REVERT_WITH_REASON
            ) {
              return assert.fail("Unexpected result type");
            }

            assert.equal(result.error.message, "mock error");
          });
        });

        describe("When the simulation succeeds", () => {
          describe("When there are insufficient funds for a transfer", () => {
            it("Should throw an error", async () => {
              const client = new LocalMockJsonRpcClient(
                "insufficient funds for transfer",
              );
              const nonceManager = new MockNonceManager();
              const deploymentLoader = new MockDeploymentLoader();

              const onchainInteraction: OnchainInteraction = {
                to: exampleAccounts[1],
                data: "0x",
                value: 0n,
                id: 1,
                type: NetworkInteractionType.ONCHAIN_INTERACTION,
                transactions: [],
                shouldBeResent: false,
              };

              await assertRejectsWithHardhatError(
                sendTransactionForOnchainInteraction(
                  client,
                  exampleAccounts[0],
                  onchainInteraction,
                  nonceManager,
                  async () => undefined,
                  deploymentLoader,
                  "test",
                ),
                HardhatError.ERRORS.IGNITION.EXECUTION
                  .INSUFFICIENT_FUNDS_FOR_TRANSFER,
                {
                  sender: exampleAccounts[0],
                  amount: "0",
                },
              );
            });
          });

          describe("When there are insufficient funds for a deployment", () => {
            it("Should throw an error", async () => {
              const client = new LocalMockJsonRpcClient(
                "contract creation code storage out of gas",
              );
              const nonceManager = new MockNonceManager();
              const deploymentLoader = new MockDeploymentLoader();

              const onchainInteraction: OnchainInteraction = {
                to: exampleAccounts[1],
                data: "0x",
                value: 0n,
                id: 1,
                type: NetworkInteractionType.ONCHAIN_INTERACTION,
                transactions: [],
                shouldBeResent: false,
              };

              await assertRejectsWithHardhatError(
                sendTransactionForOnchainInteraction(
                  client,
                  exampleAccounts[0],
                  onchainInteraction,
                  nonceManager,
                  async () => undefined,
                  deploymentLoader,
                  "test",
                ),
                HardhatError.ERRORS.IGNITION.EXECUTION
                  .INSUFFICIENT_FUNDS_FOR_DEPLOY,
                {
                  sender: exampleAccounts[0],
                },
              );
            });
          });

          describe("When the gas estimation fails for any other reason", () => {
            it("Should throw an error", async () => {
              const client = new LocalMockJsonRpcClient("unknown error");
              const nonceManager = new MockNonceManager();
              const deploymentLoader = new MockDeploymentLoader();

              const onchainInteraction: OnchainInteraction = {
                to: exampleAccounts[1],
                data: "0x",
                value: 0n,
                id: 1,
                type: NetworkInteractionType.ONCHAIN_INTERACTION,
                transactions: [],
                shouldBeResent: false,
              };

              await assertRejectsWithHardhatError(
                sendTransactionForOnchainInteraction(
                  client,
                  exampleAccounts[0],
                  onchainInteraction,
                  nonceManager,
                  async () => undefined,
                  deploymentLoader,
                  "test",
                ),
                HardhatError.ERRORS.IGNITION.EXECUTION.GAS_ESTIMATION_FAILED,
                {
                  error: "unknown error",
                },
              );
            });
          });
        });
      });
    });
  });

  describe("getNextTransactionFees", () => {
    it("Should bump fees and also take recommended network fees into account", async () => {
      // TODO @zoeyTM
    });

    it("Should re-estimate the gas limit", async () => {
      // TODO @zoeyTM
    });
  });
});

class MockGetTransactionJsonRpcClient extends StubJsonRpcClient {
  public calls: number = 0;
  public callToFindResult: number = Number.MAX_SAFE_INTEGER;
  public result: Omit<Transaction, "receipt"> | undefined = undefined;

  public override async getTransaction(
    _txHash: string,
  ): Promise<Omit<Transaction, "receipt"> | undefined> {
    if (this.calls === this.callToFindResult) {
      return this.result;
    }

    this.calls += 1;

    return undefined;
  }

  public override async getLatestBlock(): Promise<Block> {
    return {
      hash: "0xblockhas",
      number: 34,
    };
  }

  public override async getTransactionReceipt(
    _txHash: string,
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
  public override getTransactionTrackingTime(_txHash: string): number {
    return 0;
  }
}
