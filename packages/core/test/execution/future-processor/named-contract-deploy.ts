import { assert } from "chai";

import { NamedArtifactContractDeploymentFuture } from "../../../src";
import { TransactionParams } from "../../../src/internal/execution/jsonrpc-client";
import { deploymentStateReducer } from "../../../src/internal/execution/reducers/deployment-state-reducer";
import { ExecutionResultType } from "../../../src/internal/execution/types/execution-result";
import {
  ExecutionSateType,
  ExecutionStatus,
} from "../../../src/internal/execution/types/execution-state";
import { TransactionReceiptStatus } from "../../../src/internal/execution/types/jsonrpc";
import { NamedContractDeploymentFutureImplementation } from "../../../src/internal/module";
import { assertIgnitionInvariant } from "../../../src/internal/utils/assertions";
import { exampleAccounts } from "../../helpers";

import { setupFutureProcessor } from "./utils";

const exampleAddress = "0x1F98431c8aD98523631AE4a59f267346ea31F984";

describe("future processor", () => {
  const exampleTxHash =
    "0xeef10fc5170f669b86c4cd0444882a96087221325f8bf2f55d6188633aa7be7c";
  const initialDeploymentState = deploymentStateReducer(undefined);

  describe("deploying a named contract", () => {
    it("should deploy a named contract", async () => {
      // Arrange
      const fakeModule = {} as any;

      const deploymentFuture: NamedArtifactContractDeploymentFuture<string> =
        new NamedContractDeploymentFutureImplementation(
          "MyModule:TestContract",
          fakeModule,
          "TestContract",
          [],
          {},
          BigInt(0),
          exampleAccounts[0]
        );

      const { processor, storedDeployedAddresses } = await setupFutureProcessor(
        async (_transactionParams: TransactionParams) => {
          return exampleTxHash;
        },
        {
          [exampleTxHash]: {
            blockHash: `0xblockhash-5`,
            blockNumber: 1,
            contractAddress: exampleAddress,
            status: TransactionReceiptStatus.SUCCESS,
            logs: [],
          },
        }
      );

      // Act
      const result = await processor.processFuture(
        deploymentFuture,
        initialDeploymentState
      );

      // Assert
      assert.equal(
        storedDeployedAddresses["MyModule:TestContract"],
        exampleAddress
      );

      const updatedExState =
        result.newState.executionStates["MyModule:TestContract"];

      assertIgnitionInvariant(
        updatedExState.type === ExecutionSateType.DEPLOYMENT_EXECUTION_STATE,
        "to be honest this was unexpected"
      );

      assert.equal(updatedExState.status, ExecutionStatus.SUCCESS);
      assert.deepStrictEqual(updatedExState.result, {
        type: ExecutionResultType.SUCCESS,
        address: exampleAddress,
      });
    });
  });
});
