import { IgnitionError } from "../../../errors";
import { isDeploymentExecutionState } from "../../../internal/utils/guards";
import {
  DeployedContractExecutionSuccess,
  JournalableMessage,
  OnchainInteraction,
  OnchainResult,
} from "../../types/journal";
import { ExecutionStrategy } from "../types/execution-engine";
import {
  DeploymentExecutionState,
  ExecutionState,
} from "../types/execution-state";

export abstract class ExecutionStrategyBase {}

export class BasicExecutionStrategy
  extends ExecutionStrategyBase
  implements ExecutionStrategy
{
  public executeStrategy({
    executionState,
  }: {
    executionState: ExecutionState;
  }): AsyncGenerator<
    OnchainInteraction,
    JournalableMessage,
    OnchainResult | null
  > {
    if (!isDeploymentExecutionState(executionState)) {
      throw new IgnitionError(
        "Basic strategy not implemented that execution state yet"
      );
    }

    return this._executeDeployment({ executionState });
  }

  public async *_executeDeployment({
    executionState: deploymentExecutionState,
  }: {
    executionState: DeploymentExecutionState;
  }): AsyncGenerator<
    OnchainInteraction,
    JournalableMessage,
    OnchainResult | null
  > {
    const result = yield {
      type: "onchain-action",
      subtype: "deploy-contract",
      contractName: deploymentExecutionState.contractName,
      value: deploymentExecutionState.value.toString(),
      args: deploymentExecutionState.constructorArgs,
      from: deploymentExecutionState.from ?? "n/a",
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
