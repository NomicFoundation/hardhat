import { IgnitionError } from "../../../errors";
import {
  DeployedContractExecutionSuccess,
  JournalableMessage,
  OnchainInteractionMessage,
  OnchainResultMessage,
} from "../../types/journal";
import { isDeploymentExecutionState } from "../type-guards";
import { ExecutionStrategy } from "../types/execution-engine";
import {
  DeploymentExecutionState,
  ExecutionState,
} from "../types/execution-state";
import { assertIgnitionInvariant } from "../utils/assertions";

export abstract class ExecutionStrategyBase {}

export class BasicExecutionStrategy
  extends ExecutionStrategyBase
  implements ExecutionStrategy
{
  public executeStrategy({
    executionState,
    sender,
  }: {
    executionState: ExecutionState;
    sender?: string;
  }): AsyncGenerator<
    OnchainInteractionMessage,
    JournalableMessage,
    OnchainResultMessage | null
  > {
    if (!isDeploymentExecutionState(executionState)) {
      throw new IgnitionError(
        "Basic strategy not implemented that execution state yet"
      );
    }

    return this._executeDeployment({ executionState, sender });
  }

  public async *_executeDeployment({
    executionState: deploymentExecutionState,
    sender,
  }: {
    executionState: DeploymentExecutionState;
    sender?: string;
  }): AsyncGenerator<
    OnchainInteractionMessage,
    JournalableMessage,
    OnchainResultMessage | null
  > {
    assertIgnitionInvariant(
      sender !== undefined,
      "Sender must be defined for deployment execution"
    );

    const result = yield {
      type: "onchain-action",
      subtype: "deploy-contract",
      futureId: deploymentExecutionState.id,
      transactionId: 1,
      contractName: deploymentExecutionState.contractName,
      value: deploymentExecutionState.value.toString(),
      args: deploymentExecutionState.constructorArgs,
      storedArtifactPath: deploymentExecutionState.storedArtifactPath,
      from: sender,
    };

    if (result === null) {
      throw new IgnitionError("No result yielded");
    }

    const success: DeployedContractExecutionSuccess = {
      type: "execution-success",
      subtype: "deploy-contract",
      futureId: deploymentExecutionState.id,
      contractName: deploymentExecutionState.contractName,
      contractAddress: result.contractAddress,
    };

    return success;
  }
}
