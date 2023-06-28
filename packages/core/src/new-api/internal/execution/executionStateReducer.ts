import { isDeploymentType } from "../../type-guards";
import { FutureStartMessage, JournalableMessage } from "../../types/journal";
import { isDeploymentExecutionState } from "../type-guards";
import {
  DeploymentExecutionState,
  ExecutionState,
  ExecutionStateMap,
  ExecutionStatus,
} from "../types/execution-state";
import { assertIgnitionInvariant } from "../utils/assertions";

export function executionStateReducer(
  executionStateMap: ExecutionStateMap,
  action: JournalableMessage
): ExecutionStateMap {
  if (action.type === "execution-start") {
    return {
      ...executionStateMap,
      [action.futureId]: initialiseExecutionStateFor(action),
    };
  }

  if (action.type === "execution-success") {
    const previousDeploymentExecutionState = executionStateMap[action.futureId];

    assertIgnitionInvariant(
      previousDeploymentExecutionState !== undefined &&
        isDeploymentExecutionState(previousDeploymentExecutionState),
      "TBD - only deployment state is currently implemented for execution success"
    );

    const updatedExecutionState: ExecutionState = {
      ...previousDeploymentExecutionState,
      status: ExecutionStatus.SUCCESS,
      contractAddress: action.contractAddress,
    };

    return {
      ...executionStateMap,
      [action.futureId]: updatedExecutionState,
    };
  }

  if (action.type === "onchain-action" || action.type === "onchain-result") {
    const previousExState = executionStateMap[action.futureId];

    assertIgnitionInvariant(
      previousExState !== undefined,
      "On chain message for nonexistant future"
    );

    const updateWithOnchainAction: ExecutionState = {
      ...previousExState,
      history: [...previousExState.history, action],
    };

    return {
      ...executionStateMap,
      [action.futureId]: updateWithOnchainAction,
    };
  }

  return executionStateMap;
}

function initialiseExecutionStateFor(
  futureStart: FutureStartMessage
): ExecutionState {
  if (!isDeploymentType(futureStart.futureType)) {
    throw new Error("Not implemented yet in the reducer");
  }

  const deploymentExecutionState: DeploymentExecutionState = {
    id: futureStart.futureId,
    futureType: futureStart.futureType,
    strategy: futureStart.strategy,
    status: ExecutionStatus.STARTED,
    dependencies: new Set(futureStart.dependencies),
    history: [],
    storedArtifactPath: futureStart.storedArtifactPath,
    storedBuildInfoPath: futureStart.storedBuildInfoPath,
    contractName: futureStart.contractName,
    value: BigInt(futureStart.value),
    constructorArgs: futureStart.constructorArgs,
    libraries: futureStart.libraries,
    from: futureStart.from,
  };

  return deploymentExecutionState;
}
