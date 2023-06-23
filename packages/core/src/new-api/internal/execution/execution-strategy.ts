import { IgnitionError } from "../../../errors";
import {
  CallFunctionInteractionMessage,
  CalledFunctionExecutionSuccess,
  DeployContractInteractionMessage,
  DeployedContractExecutionSuccess,
  JournalableMessage,
  OnchainCallFunctionSuccessMessage,
  OnchainDeployContractSuccessMessage,
  OnchainInteractionMessage,
  OnchainResultMessage,
  OnchainStaticCallSuccessMessage,
  StaticCallExecutionSuccess,
  StaticCallInteractionMessage,
} from "../../types/journal";
import {
  isCallExecutionState,
  isDeploymentExecutionState,
  isStaticCallExecutionState,
} from "../type-guards";
import { ExecutionStrategy } from "../types/execution-engine";
import {
  CallExecutionState,
  DeploymentExecutionState,
  ExecutionState,
  StaticCallExecutionState,
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
    if (isDeploymentExecutionState(executionState)) {
      return this._executeDeployment({ executionState, sender });
    }

    if (isCallExecutionState(executionState)) {
      return this._executeCall({ executionState, sender });
    }

    if (isStaticCallExecutionState(executionState)) {
      return this._executeStaticCall({ executionState, sender });
    }

    throw new IgnitionError(
      "Basic strategy not implemented that execution state yet"
    );
  }

  private async *_executeDeployment({
    executionState: deploymentExecutionState,
    sender,
  }: {
    executionState: DeploymentExecutionState;
    sender?: string;
  }): AsyncGenerator<
    DeployContractInteractionMessage,
    DeployedContractExecutionSuccess,
    OnchainDeployContractSuccessMessage | null
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

  private async *_executeCall({
    executionState: callExecutionState,
    sender,
  }: {
    executionState: CallExecutionState;
    sender?: string;
  }): AsyncGenerator<
    CallFunctionInteractionMessage,
    CalledFunctionExecutionSuccess,
    OnchainCallFunctionSuccessMessage | null
  > {
    assertIgnitionInvariant(
      sender !== undefined,
      "Sender must be defined for call execution"
    );

    const result = yield {
      type: "onchain-action",
      subtype: "call-function",
      futureId: callExecutionState.id,
      transactionId: 1,
      contractAddress: callExecutionState.contractAddress,
      storedArtifactPath: callExecutionState.storedArtifactPath,
      value: callExecutionState.value.toString(),
      args: callExecutionState.args,
      functionName: callExecutionState.functionName,
      from: sender,
    };

    if (result === null) {
      throw new IgnitionError("No result yielded");
    }

    const success: CalledFunctionExecutionSuccess = {
      type: "execution-success",
      subtype: "call-function",
      futureId: callExecutionState.id,
      contractAddress: callExecutionState.contractAddress,
      functionName: callExecutionState.functionName,
      txId: result.txId,
    };

    return success;
  }

  private async *_executeStaticCall({
    executionState: staticCallExecutionState,
    sender,
  }: {
    executionState: StaticCallExecutionState;
    sender?: string;
  }): AsyncGenerator<
    StaticCallInteractionMessage,
    StaticCallExecutionSuccess,
    OnchainStaticCallSuccessMessage | null
  > {
    assertIgnitionInvariant(
      sender !== undefined,
      "Sender must be defined for static call execution"
    );

    const result = yield {
      type: "onchain-action",
      subtype: "static-call",
      futureId: staticCallExecutionState.id,
      transactionId: 1,
      contractAddress: staticCallExecutionState.contractAddress,
      storedArtifactPath: staticCallExecutionState.storedArtifactPath,
      args: staticCallExecutionState.args,
      functionName: staticCallExecutionState.functionName,
      from: sender,
    };

    if (result === null) {
      throw new IgnitionError("No result yielded");
    }

    const success: StaticCallExecutionSuccess = {
      type: "execution-success",
      subtype: "static-call",
      futureId: staticCallExecutionState.id,
      contractAddress: staticCallExecutionState.contractAddress,
      functionName: staticCallExecutionState.functionName,
      result: result.result,
    };

    return success;
  }
}
