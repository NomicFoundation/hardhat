import { assert } from "chai";

import {
  FutureType,
  IgnitionModule,
  IgnitionModuleResult,
  buildModule,
} from "../../../src";
import { JsonRpcClient } from "../../../src/internal/execution/jsonrpc-client";
import { getNonceSyncMessages } from "../../../src/internal/execution/nonce-management/get-nonce-sync-messages";
import { deploymentStateReducer } from "../../../src/internal/execution/reducers/deployment-state-reducer";
import { DeploymentState } from "../../../src/internal/execution/types/deployment-state";
import {
  DeploymentExecutionState,
  ExecutionSateType,
  ExecutionStatus,
} from "../../../src/internal/execution/types/execution-state";
import {
  JournalMessageType,
  OnchainInteractionDroppedMessage,
  OnchainInteractionReplacedByUserMessage,
} from "../../../src/internal/execution/types/messages";
import {
  NetworkInteractionType,
  OnchainInteraction,
} from "../../../src/internal/execution/types/network-interaction";
import { exampleAccounts } from "../../helpers";

const requiredConfirmations = 5;

describe("execution - getNonceSyncMessages", () => {
  let exampleModule: IgnitionModule<
    string,
    string,
    IgnitionModuleResult<string>
  >;

  const exampleDeploymentState: DeploymentExecutionState = {
    id: "Example",
    type: ExecutionSateType.DEPLOYMENT_EXECUTION_STATE,
    futureType: FutureType.CONTRACT_DEPLOYMENT,
    strategy: "basic",
    strategyConfig: {},
    status: ExecutionStatus.STARTED,
    dependencies: new Set<string>(),
    networkInteractions: [],
    artifactId: "./artifact.json",
    contractName: "Contract1",
    value: BigInt("0"),
    constructorArgs: [],
    libraries: {},
    from: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
  };

  beforeEach(() => {
    exampleModule = buildModule("Example", (m) => {
      const myContract = m.contract("MyContract", [], {
        from: exampleAccounts[1],
      });

      // A follow on contract deploy using the same sender.
      // This was added, due to a bug where the presence
      // of futures with the same sender cleared the
      // pending transactions. See issue #574.
      m.contract("AnotherContract", [], {
        from: exampleAccounts[1],
        after: [myContract],
      });

      return {};
    });
  });

  describe("first deployment run", () => {
    it("should allow if there are no pending transactions for all of the future's senders", async () => {
      // Set latest block to an arbitrary nonce
      const latestCount1 = 55;
      // The safest is the same as latest, as it is not relevant to this test
      const safestCount1 = latestCount1;
      // There are no pending transactions
      const pendingCount1 = latestCount1;

      // Set latest block to an arbitrary nonce
      const latestCount2 = 12;
      // The safest is the same as latest, as it is not relevant to this test
      const safestCount2 = latestCount2;
      // There are no pending transactions
      const pendingCount2 = latestCount2;

      const ignitionModule = buildModule("Example", (m) => {
        m.contract("MyContract", [], { from: exampleAccounts[1] });
        m.contract("AnotherContract", [], { from: undefined });

        return {};
      });

      await assertNoSyncMessageNeeded({
        ignitionModule,
        transactionCountEntries: {
          [exampleAccounts[1]]: {
            pending: pendingCount1,
            latest: latestCount1,
            number: () => safestCount1,
          },
          [exampleAccounts[2]]: {
            pending: pendingCount2,
            latest: latestCount2,
            number: () => safestCount2,
          },
        },
      });
    });

    it("should throw if there is a pending transaction for a future's sender", async () => {
      // Set the latest block to be an arbitrary nonce
      const latestCount = 30;
      // Safest is the same as latest as it is not relevant in this test
      const safestCount = latestCount;
      // There are pending transactions
      const pendingCount = latestCount + 1;

      await assertGetNonceSyncThrows(
        {
          ignitionModule: exampleModule,
          transactionCountEntries: {
            [exampleAccounts[1]]: {
              pending: pendingCount,
              latest: latestCount,
              number: () => safestCount,
            },
          },
        },
        `IGN403: You have sent transactions from ${exampleAccounts[1]} and they interfere with Hardhat Ignition. Please wait until they get 5 confirmations before running Hardhat Ignition again.`,
      );
    });

    it("should throw if there is a confirmed transaction for a future's sender that doesn't have enough confirmations yet", async () => {
      // Set the latest block to be an arbitrary nonce
      const latestCount = 30;
      // Safest is the same as latest as it is not relevant in this test
      const safestCount = 29;
      // There are pending transactions
      const pendingCount = latestCount;

      await assertGetNonceSyncThrows(
        {
          ignitionModule: exampleModule,
          transactionCountEntries: {
            [exampleAccounts[1]]: {
              pending: pendingCount,
              latest: latestCount,
              number: () => safestCount,
            },
          },
        },
        `IGN403: You have sent transactions from ${exampleAccounts[1]} and they interfere with Hardhat Ignition. Please wait until they get 5 confirmations before running Hardhat Ignition again.`,
      );
    });

    describe("With less blocks than the required confirmations", () => {
      it("Should run on if there aren't any transaction", async () => {
        // No transactions
        const latestCount1 = 0;
        const pendingCount1 = latestCount1;

        const latestCount2 = 0;
        const pendingCount2 = latestCount2;

        const ignitionModule = buildModule("Example", (m) => {
          m.contract("MyContract", [], { from: exampleAccounts[1] });
          m.contract("AnotherContract", [], { from: undefined });

          return {};
        });

        await assertGetNonceSyncResult(
          {
            ignitionModule,
            transactionCountEntries: {
              [exampleAccounts[1]]: {
                pending: pendingCount1,
                latest: latestCount1,
                number: () => {
                  throw new Error("Should not be called");
                },
              },
              [exampleAccounts[2]]: {
                pending: pendingCount2,
                latest: latestCount2,
                number: () => {
                  throw new Error("Should not be called");
                },
              },
            },
            latestBlockNumber: 0,
          },
          [],
        );
      });

      it("Should throw if there's any transaction sent by the user", async () => {
        // No transactions
        const latestCount1 = 1;
        const pendingCount1 = latestCount1;

        const ignitionModule = buildModule("Example", (m) => {
          m.contract("MyContract", [], { from: exampleAccounts[1] });

          return {};
        });

        await assertGetNonceSyncThrows(
          {
            ignitionModule,
            transactionCountEntries: {
              [exampleAccounts[1]]: {
                pending: pendingCount1,
                latest: latestCount1,
                number: () => {
                  throw new Error("Should not be called");
                },
              },
              // We define this just to validate that it's ignored, as its the default sender, but it won't be used
              [exampleAccounts[2]]: {
                pending: 2,
                latest: 2,
                number: () => {
                  throw new Error("Should not be called");
                },
              },
            },
            latestBlockNumber: 3,
          },
          `IGN403: You have sent transactions from ${exampleAccounts[1]} and they interfere with Hardhat Ignition. Please wait until they get 5 confirmations before running Hardhat Ignition again.`,
        );
      });
    });
  });

  describe("second deployment run", () => {
    const latestBlockNumbers = [0, 3, 10];

    for (const latestBlockNumber of latestBlockNumbers) {
      describe(`With latest block #${latestBlockNumber} and ${requiredConfirmations} required confirmations`, () => {
        it("should succeed with an in-flight transaction that has been mined between runs", async () => {
          // Assuming a fresh chain, and a deployment that was halted on the first
          // future and its deploy transaction is included in a block before the
          // next run

          // The in-flight transaction has been included in a block, so latest includes it
          const latestCount = 1;
          // Safest is x blocks in the past so is zero
          const safestCount = 0;
          // There are no pending
          const pendingCount = latestCount;
          // The nonce of the now complete transaction is 0
          const nonce = 0;

          const deploymentState =
            setupDeploymentStateBasedOnExampleModuleWithOneTranWith(nonce);

          const inflightTxHash = (
            (
              deploymentState.executionStates[
                "Example#MyContract"
              ] as DeploymentExecutionState
            ).networkInteractions[0] as OnchainInteraction
          ).transactions[0].hash;

          await assertNoSyncMessageNeeded({
            ignitionModule: exampleModule,
            deploymentState,
            transactionCountEntries: {
              [exampleAccounts[1]]: {
                pending: pendingCount,
                latest: latestCount,
                number: () => safestCount,
              },
            },
            // We are saying that the inflight transaction is now included in a block
            getTransaction: (txHash: string) => {
              if (txHash !== inflightTxHash) {
                throw new Error(
                  `Mock getTransaction was not expecting the getTransaction request for: ${txHash}`,
                );
              }

              return { _kind: "FAKE_TRANSACTION" };
            },
            latestBlockNumber,
          });
        });

        it("should succeed with an in-flight transaction that has been completely confirmed between runs", async () => {
          // Assuming a fresh chain, and a deployment that was halted on the first
          // future and its deploy transaction is completly confirmed now

          const latestCount = 1;
          const safestCount = 1;
          const pendingCount = latestCount;
          const nonce = 0;

          const deploymentState =
            setupDeploymentStateBasedOnExampleModuleWithOneTranWith(nonce);

          const inflightTxHash = (
            (
              deploymentState.executionStates[
                "Example#MyContract"
              ] as DeploymentExecutionState
            ).networkInteractions[0] as OnchainInteraction
          ).transactions[0].hash;

          await assertNoSyncMessageNeeded({
            ignitionModule: exampleModule,
            deploymentState,
            transactionCountEntries: {
              [exampleAccounts[1]]: {
                pending: pendingCount,
                latest: latestCount,
                number: () => safestCount,
              },
            },
            // We are saying that the inflight transaction is now completely
            getTransaction: (txHash: string) => {
              if (txHash !== inflightTxHash) {
                throw new Error(
                  `Mock getTransaction was not expecting the getTransaction request for: ${txHash}`,
                );
              }

              return { _kind: "FAKE_TRANSACTION" };
            },
            latestBlockNumber,
          });
        });

        it("should succeed with an in-flight transaction that has not been mined between runs but is in the mempool", async () => {
          // Assuming a fresh chain, and a deployment that was halted on the first
          // future and its deploy transaction is in the mempool but not mined
          // at the start of the second run

          const latestCount = 0;
          const safestCount = 0;
          const pendingCount = latestCount + 1;
          const nonce = 0;

          const deploymentState =
            setupDeploymentStateBasedOnExampleModuleWithOneTranWith(nonce);

          const inflightTxHash = (
            (
              deploymentState.executionStates[
                "Example#MyContract"
              ] as DeploymentExecutionState
            ).networkInteractions[0] as OnchainInteraction
          ).transactions[0].hash;

          await assertNoSyncMessageNeeded({
            ignitionModule: exampleModule,
            deploymentState,
            transactionCountEntries: {
              [exampleAccounts[1]]: {
                pending: pendingCount,
                latest: latestCount,
                number: () => safestCount,
              },
            },
            // We are saying that the inflight transaction is still in the mempool
            getTransaction: (txHash: string) => {
              if (txHash !== inflightTxHash) {
                throw new Error(
                  `Mock getTransaction was not expecting the getTransaction request for: ${txHash}`,
                );
              }

              return { _kind: "FAKE_TRANSACTION" };
            },
            latestBlockNumber,
          });
        });

        it("should indicate the user replaced the transaction and the user transaction is safely confirmed", async () => {
          if (latestBlockNumber < requiredConfirmations - 1) {
            // This test doesn't make sense if we can't really get completely confirmed transactions
            return;
          }

          // Set latest to be an arbitrary nonce
          const latestCount = 30;
          // Set safest to be the same as latest, it is not relevant
          const safestCount = latestCount;
          // There are no pending transactions
          const pendingCount = latestCount;
          // Set the nonce to be less than latest, indicating it was replaced
          const nonce = latestCount - 1;

          await assertGetNonceSyncResult(
            {
              ignitionModule: exampleModule,
              deploymentState:
                setupDeploymentStateBasedOnExampleModuleWithOneTranWith(nonce),
              transactionCountEntries: {
                [exampleAccounts[1]]: {
                  pending: pendingCount,
                  latest: latestCount,
                  number: () => safestCount,
                },
              },
              latestBlockNumber,
            },
            [
              {
                futureId: "Example#MyContract",
                networkInteractionId: 1,
                type: JournalMessageType.ONCHAIN_INTERACTION_REPLACED_BY_USER,
              },
            ],
          );
        });

        it("should throw if the user replaced the transaction and the user transaction is mined but has not yet fully confirmed", async () => {
          // set an arbitrary nonce
          const nonce = 16;
          // put the latest as bigger than the nonce being checked
          const latest = nonce + 1;
          // there are no pending
          const pending = latest;
          // the safest is behind the nonce
          const safest = nonce - 1;

          await assertGetNonceSyncThrows(
            {
              ignitionModule: exampleModule,
              deploymentState:
                setupDeploymentStateBasedOnExampleModuleWithOneTranWith(nonce),
              transactionCountEntries: {
                [exampleAccounts[1]]: {
                  pending,
                  latest,
                  number: () => safest,
                },
              },
              latestBlockNumber,
            },
            `IGN404: You have sent transactions from ${exampleAccounts[1]} with nonce 16 and it interferes with Hardhat Ignition. Please wait until they get 5 confirmations before running Hardhat Ignition again.`,
          );
        });

        it("should error if the user replaced the transaction and the user transaction is in the mempool but not mined (pending)", async () => {
          // Set latest to an arbitary nonce
          const latestCount = 30;
          // Safe is the same as latest
          const safestCount = latestCount;
          // Set the nonce to be the latest (nonce's are ids not cardinalities)
          const nonce = latestCount;
          // Set pending larger than the nonce
          const pendingCount = nonce + 1;

          await assertGetNonceSyncThrows(
            {
              ignitionModule: exampleModule,
              deploymentState:
                setupDeploymentStateBasedOnExampleModuleWithOneTranWith(nonce),
              transactionCountEntries: {
                [exampleAccounts[1]]: {
                  pending: pendingCount,
                  latest: latestCount,
                  number: () => safestCount,
                },
              },
              latestBlockNumber,
            },
            `IGN404: You have sent transactions from ${exampleAccounts[1]} with nonce 30 and it interferes with Hardhat Ignition. Please wait until they get 5 confirmations before running Hardhat Ignition again.`,
          );
        });

        it("should throw if the user sent transactions with higher nonces than ignition's highest pending nonce, that have not all confirmed", async () => {
          // The ignition transaction is in the mempool but unmined
          // Further user transactions have followed from the user, they have not
          // mined either yet - by definition.

          // set an arbitrary nonce
          const nonce = 10;
          // Set the latest to be equivalent to the everything before the
          // Ignition transaction waiting in the mempool
          const latest = nonce;
          // there are further user provided transactions pending
          const pending = latest + 1 /* ignition sent */ + 1; /* user sent */
          // the safest has only caught up with latest
          const safest = latest;

          const deploymentState =
            setupDeploymentStateBasedOnExampleModuleWithOneTranWith(nonce);

          const inflightTxHash = (
            (
              deploymentState.executionStates[
                "Example#MyContract"
              ] as DeploymentExecutionState
            ).networkInteractions[0] as OnchainInteraction
          ).transactions[0].hash;

          await assertGetNonceSyncThrows(
            {
              ignitionModule: exampleModule,
              deploymentState,
              transactionCountEntries: {
                [exampleAccounts[1]]: {
                  pending,
                  latest,
                  number: () => safest,
                },
              },
              getTransaction: (txHash: string) => {
                if (txHash !== inflightTxHash) {
                  throw new Error(
                    `Mock getTransaction was not expecting the getTransaction request for: ${txHash}`,
                  );
                }

                return { _kind: "FAKE_TRANSACTION" };
              },
              latestBlockNumber,
            },
            `IGN404: You have sent transactions from ${exampleAccounts[1]} with nonce 11 and it interferes with Hardhat Ignition. Please wait until they get 5 confirmations before running Hardhat Ignition again.`,
          );
        });

        it("should pass if the user sent transactions with higher nonces than ignition's highest pending nonce but they have confirmed", async () => {
          if (latestBlockNumber < requiredConfirmations - 1) {
            // This test doesn't make sense if we can't really get completely confirmed transactions
            return;
          }

          // The ignition transaction was sent, the process killed, but is now mined.
          // Further user transactions have followed from the user, they have been mined
          // and are now confirmed.

          // set an arbitrary nonce
          const nonce = 10;
          // Set the latest to be equivalent of the Ignition nonce mined
          // plus an additional user transaction also mined
          const latest = nonce + 1 /* ignition sent */ + 1; /* user sent */
          // there are thus none pending
          const pending = latest;
          // the safest caught up with latest
          const safest = latest;

          const deploymentState =
            setupDeploymentStateBasedOnExampleModuleWithOneTranWith(nonce);

          const inflightTxHash = (
            (
              deploymentState.executionStates[
                "Example#MyContract"
              ] as DeploymentExecutionState
            ).networkInteractions[0] as OnchainInteraction
          ).transactions[0].hash;

          await assertNoSyncMessageNeeded({
            ignitionModule: exampleModule,
            deploymentState,
            transactionCountEntries: {
              [exampleAccounts[1]]: {
                pending,
                latest,
                number: () => safest,
              },
            },
            getTransaction: (txHash: string) => {
              if (txHash !== inflightTxHash) {
                throw new Error(
                  `Mock getTransaction was not expecting the getTransaction request for: ${txHash}`,
                );
              }

              return { _kind: "FAKE_TRANSACTION" };
            },
            latestBlockNumber,
          });
        });

        it("should indicate if the ignition transaction was dropped from mempool (no user interference)", async () => {
          // Set an arbitary latest
          const latestCount = 30;
          // The safest is exactly the same as latest
          const safestCount = latestCount;
          // Pending isn't relevant so is set to latest
          const pendingCount = latestCount;
          // Set the nonce to latest (note nonce is not a cardinality),
          // indicating it was dropped as latest/pending should be larger
          // than the nonce
          const nonce = latestCount;

          await assertGetNonceSyncResult(
            {
              ignitionModule: exampleModule,
              deploymentState:
                setupDeploymentStateBasedOnExampleModuleWithOneTranWith(nonce),
              transactionCountEntries: {
                [exampleAccounts[1]]: {
                  pending: pendingCount,
                  latest: latestCount,
                  number: () => safestCount,
                },
              },
              latestBlockNumber,
            },
            [
              {
                futureId: "Example#MyContract",
                networkInteractionId: 1,
                type: JournalMessageType.ONCHAIN_INTERACTION_DROPPED,
              },
            ],
          );
        });

        it("should ignore futures that have already been completed", async () => {
          // Safest count nonce is set arbitarily
          const latestCount = 40;
          // Safest is the same as latest
          const safestCount = latestCount;
          // There are multiple pending transactions on top of latest
          const pendingCount = latestCount + 99;

          await assertNoSyncMessageNeeded({
            ignitionModule: exampleModule,
            deploymentState: {
              ...deploymentStateReducer(),
              executionStates: {
                "Example#MyContract": {
                  ...exampleDeploymentState,
                  id: "Example#MyContract",
                  status: ExecutionStatus.SUCCESS,
                },
                "Example#AnotherContract": {
                  ...exampleDeploymentState,
                  id: "Example#AnotherContract",
                  status: ExecutionStatus.SUCCESS,
                },
              },
            },
            transactionCountEntries: {
              [exampleAccounts[1]]: {
                pending: pendingCount,
                latest: latestCount,
                number: () => safestCount,
              },
            },
            latestBlockNumber,
          });
        });
      });
    }
  });
});

async function assertGetNonceSyncThrows(
  ctx: {
    ignitionModule: IgnitionModule<
      string,
      string,
      IgnitionModuleResult<string>
    >;
    deploymentState?: DeploymentState;
    transactionCountEntries?: {
      [key: string]: {
        pending: number;
        latest: number;
        number: (num: number) => number;
      };
    };
    getTransaction?: (txHash: string) => any;
    latestBlockNumber?: number;
  },
  errorMessage: string,
) {
  await assert.isRejected(assertGetNonceSyncResult(ctx, []), errorMessage);
}

async function assertNoSyncMessageNeeded(ctx: {
  ignitionModule: IgnitionModule<string, string, IgnitionModuleResult<string>>;
  deploymentState?: DeploymentState;
  transactionCountEntries?: {
    [key: string]: {
      pending: number;
      latest: number;
      number: (num: number) => number;
    };
  };
  getTransaction?: (txHash: string) => any;
  latestBlockNumber?: number;
}) {
  return assertGetNonceSyncResult(ctx, []);
}

async function assertGetNonceSyncResult(
  {
    ignitionModule,
    deploymentState = deploymentStateReducer(),
    transactionCountEntries = {},
    getTransaction,
    latestBlockNumber = 10,
  }: {
    ignitionModule: IgnitionModule<
      string,
      string,
      IgnitionModuleResult<string>
    >;
    deploymentState?: DeploymentState;
    transactionCountEntries?: {
      [key: string]: {
        pending: number;
        latest: number;
        number: (num: number) => number;
      };
    };
    getTransaction?: (txHash: string) => any;
    latestBlockNumber?: number;
  },
  expectedResult: Array<
    OnchainInteractionReplacedByUserMessage | OnchainInteractionDroppedMessage
  >,
) {
  const mockJsonRpcClient = setupJsonRpcClient(
    latestBlockNumber,
    transactionCountEntries,
    getTransaction,
  );

  const result = await getNonceSyncMessages(
    mockJsonRpcClient,
    deploymentState,
    ignitionModule,
    exampleAccounts,
    exampleAccounts[2],
    requiredConfirmations,
  );

  assert.deepStrictEqual(result, expectedResult);
}

function setupJsonRpcClient(
  latestBlockNum: number,
  transactionCountEntries: {
    [key: string]: {
      pending: number;
      latest: number;
      number: (num: number) => number;
    };
  },
  getTransaction?: (txHash: string) => any,
): JsonRpcClient {
  const mockJsonRpcClient = {
    getLatestBlock: () => {
      return { number: latestBlockNum };
    },
    getTransaction: (txHash: string) => {
      if (getTransaction !== undefined) {
        return getTransaction(txHash);
      }

      return undefined; // Inflight transactions are never found by default
    },
    getTransactionCount: (
      address: string,
      blockTag: "pending" | "latest" | number,
    ) => {
      const transactionCountEntry = transactionCountEntries[address];

      if (transactionCountEntry === undefined) {
        throw new Error(
          `Mock getTransactionCount was not expecting the sender: ${address}`,
        );
      }

      if (blockTag === "pending") {
        return transactionCountEntry.pending;
      } else if (blockTag === "latest") {
        return transactionCountEntry.latest;
      } else {
        return transactionCountEntry.number(blockTag);
      }
    },
  } as any;

  return mockJsonRpcClient;
}

function setupDeploymentStateBasedOnExampleModuleWithOneTranWith(
  nonce: number,
): DeploymentState {
  const exampleDeploymentState: DeploymentExecutionState = {
    id: "Example",
    type: ExecutionSateType.DEPLOYMENT_EXECUTION_STATE,
    futureType: FutureType.CONTRACT_DEPLOYMENT,
    strategy: "basic",
    strategyConfig: {},
    status: ExecutionStatus.STARTED,
    dependencies: new Set<string>(),
    networkInteractions: [],
    artifactId: "./artifact.json",
    contractName: "Contract1",
    value: BigInt("0"),
    constructorArgs: [],
    libraries: {},
    from: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
  };

  return {
    ...deploymentStateReducer(),
    executionStates: {
      "Example#MyContract": {
        ...exampleDeploymentState,
        id: "Example#MyContract",
        status: ExecutionStatus.STARTED,
        from: exampleAccounts[1],
        networkInteractions: [
          {
            id: 1,
            type: NetworkInteractionType.ONCHAIN_INTERACTION,
            to: undefined,
            data: "0x",
            value: BigInt(0),
            transactions: [
              {
                hash: "0x123",
                fees: {
                  gasPrice: BigInt(10000),
                },
              },
            ],
            shouldBeResent: false,
            nonce,
          },
        ],
      },
    },
  };
}
