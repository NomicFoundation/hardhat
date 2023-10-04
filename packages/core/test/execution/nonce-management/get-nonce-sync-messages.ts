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
import { NetworkInteractionType } from "../../../src/internal/execution/types/network-interaction";
import { exampleAccounts } from "../../helpers";

const requiredConfirmations = 5;
const latestBlock = 10;

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
      m.contract("MyContract", [], { from: exampleAccounts[1] });

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

      await assertSuccessOnGetNonceSyncResult({
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

    it("should throw if there are pending transactions for a future's sender", async () => {
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
        `IGN403: You have sent transactions from ${exampleAccounts[1]}. Please wait until they get 5 confirmations before running Ignition again.`
      );
    });
  });

  describe("second deployment run", () => {
    it("should indicate the user replaced the transaction if the transaction's nonce is less than the latest", async () => {
      // Set latest to be an arbitrary nonce
      const latestCount = 30;
      // Set safest to be the same as latest, it is not relevant
      const safestCount = latestCount;
      // There are no pending transactions
      const pendingCount = latestCount;
      // Set the nonce to be less than latest, indicating it was replaced
      const nonce = latestCount - 2;

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
        },
        [
          {
            futureId: "Example#MyContract",
            networkInteractionId: 1,
            type: JournalMessageType.ONCHAIN_INTERACTION_REPLACED_BY_USER,
          },
        ]
      );
    });

    it("should error if the user has sent a non-ignition pending transaction that has not confirmed on the account", async () => {
      // Set latest to an arbitary nonce
      const latestCount = 30;
      // Safe is the same as latest
      const safestCount = latestCount;
      // Set the nonce to be larger than latest
      const nonce = latestCount + 1;
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
        },
        `IGN404: You have sent transactions from ${exampleAccounts[1]} with nonce 31. Please wait until they get 5 confirmations before running Ignition again.`
      );
    });

    it("should indicate the transaction was dropped if the nonce is higher than the latest", async () => {
      // Set an arbitary latest
      const latestCount = 30;
      // The safest is exactly the same as latest
      const safestCount = 40;
      // Pending isn't relevant so is set to latest
      const pendingCount = latestCount;
      // Set the nonce higher than latest, indicating it was dropped
      const nonce = latestCount + 1;

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
        },
        [
          {
            futureId: "Example#MyContract",
            networkInteractionId: 1,
            type: JournalMessageType.ONCHAIN_INTERACTION_DROPPED,
          },
        ]
      );
    });

    it("should ignore futures that have already been completed", async () => {
      // Safest count nonce is set arbitarily
      const latestCount = 40;
      // Safest is the same as latest
      const safestCount = latestCount;
      // There are multiple pending transactions on top of latest
      const pendingCount = latestCount + 99;

      await assertSuccessOnGetNonceSyncResult({
        ignitionModule: exampleModule,
        deploymentState: {
          ...deploymentStateReducer(),
          executionStates: {
            "Example#MyContract": {
              ...exampleDeploymentState,
              id: "Example#MyContract",
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
      });
    });
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
  },
  errorMessage: string
) {
  await assert.isRejected(assertGetNonceSyncResult(ctx, []), errorMessage);
}

async function assertSuccessOnGetNonceSyncResult(ctx: {
  ignitionModule: IgnitionModule<string, string, IgnitionModuleResult<string>>;
  deploymentState?: DeploymentState;
  transactionCountEntries?: {
    [key: string]: {
      pending: number;
      latest: number;
      number: (num: number) => number;
    };
  };
}) {
  return assertGetNonceSyncResult(ctx, []);
}

async function assertGetNonceSyncResult(
  {
    ignitionModule,
    deploymentState = deploymentStateReducer(),
    transactionCountEntries = {},
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
  },
  expectedResult: Array<
    OnchainInteractionReplacedByUserMessage | OnchainInteractionDroppedMessage
  >
) {
  const mockJsonRpcClient = setupJsonRpcClient(
    latestBlock,
    transactionCountEntries
  );

  const result = await getNonceSyncMessages(
    mockJsonRpcClient,
    deploymentState,
    ignitionModule,
    exampleAccounts,
    exampleAccounts[2],
    requiredConfirmations
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
  }
): JsonRpcClient {
  const mockJsonRpcClient = {
    getLatestBlock: () => {
      return { number: latestBlockNum };
    },
    getTransactionCount: (
      address: string,
      blockTag: "pending" | "latest" | number
    ) => {
      const transactionCountEntry = transactionCountEntries[address];

      if (transactionCountEntry === undefined) {
        throw new Error(
          `Mock getTransactionCount was not expecting the sender: ${address}`
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
  nonce: number
): DeploymentState {
  const exampleDeploymentState: DeploymentExecutionState = {
    id: "Example",
    type: ExecutionSateType.DEPLOYMENT_EXECUTION_STATE,
    futureType: FutureType.CONTRACT_DEPLOYMENT,
    strategy: "basic",
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
            transactions: [],
            shouldBeResent: false,
            nonce,
          },
        ],
      },
    },
  };
}
