import { isDeploymentType } from "../../type-guards";
import { FutureStart, JournalableMessage } from "../../types/journal";
import {
  DeploymentExecutionState,
  ExecutionState,
  ExecutionStateMap,
  ExecutionStatus,
} from "../types/execution-state";

export function executionStateReducer(
  executionStateMap: ExecutionStateMap,
  action: JournalableMessage
) {
  if (action.type === "execution-start") {
    return {
      ...executionStateMap,
      [action.futureId]: initialiseExecutionStateFor(action),
    };
  }

  if (action.type === "execution-success") {
    const updatedExecutionState: DeploymentExecutionState = {
      ...(executionStateMap[action.futureId] as DeploymentExecutionState),
      status: ExecutionStatus.SUCCESS,
      contractAddress: action.contractAddress,
    };

    return {
      ...executionStateMap,
      [action.futureId]: updatedExecutionState,
    };
  }

  return executionStateMap;
}

function initialiseExecutionStateFor(futureStart: FutureStart): ExecutionState {
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
