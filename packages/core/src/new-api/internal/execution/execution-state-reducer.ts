import { FutureStartMessage, JournalableMessage } from "../../types/journal";
import {
  isCallFunctionStartMessage,
  isContractAtStartMessage,
  isDeployContractStartMessage,
  isFutureStartMessage,
  isReadEventArgumentStartMessage,
  isSendDataStartMessage,
  isStaticCallStartMessage,
  isTransactionMessage,
} from "../journal/type-guards";
import {
  CallExecutionState,
  ContractAtExecutionState,
  DeploymentExecutionState,
  ExecutionState,
  ExecutionStateMap,
  ExecutionStatus,
  OnchainStatuses,
  ReadEventArgumentExecutionState,
  SendDataExecutionState,
  StaticCallExecutionState,
} from "../types/execution-state";
import { assertIgnitionInvariant } from "../utils/assertions";

import { isExecutionFailure } from "./guards";
import { onchainActionReducer } from "./onchain-action-reducer";

export function executionStateReducer(
  executionStateMap: ExecutionStateMap,
  action: JournalableMessage
): ExecutionStateMap {
  if (isFutureStartMessage(action)) {
    return {
      ...executionStateMap,
      [action.futureId]: initialiseExecutionStateFor(action),
    };
  }

  if (action.type === "execution-success") {
    const previousDeploymentExecutionState = executionStateMap[action.futureId];

    if (action.subtype === "deploy-contract") {
      const updatedExecutionState: DeploymentExecutionState = {
        ...(previousDeploymentExecutionState as DeploymentExecutionState),
        status: ExecutionStatus.SUCCESS,
        contractAddress: action.contractAddress,
        txId: action.txId,
      };

      return {
        ...executionStateMap,
        [action.futureId]: updatedExecutionState,
      };
    }

    if (action.subtype === "call-function") {
      const updatedExecutionState: CallExecutionState = {
        ...(previousDeploymentExecutionState as CallExecutionState),
        status: ExecutionStatus.SUCCESS,
        txId: action.txId,
      };

      return {
        ...executionStateMap,
        [action.futureId]: updatedExecutionState,
      };
    }

    if (action.subtype === "static-call") {
      const updatedExecutionState: StaticCallExecutionState = {
        ...(previousDeploymentExecutionState as StaticCallExecutionState),
        status: ExecutionStatus.SUCCESS,
        result: action.result,
      };

      return {
        ...executionStateMap,
        [action.futureId]: updatedExecutionState,
      };
    }

    if (action.subtype === "read-event-arg") {
      const updatedExecutionState: ReadEventArgumentExecutionState = {
        ...(previousDeploymentExecutionState as ReadEventArgumentExecutionState),
        status: ExecutionStatus.SUCCESS,
        result: action.result,
      };

      return {
        ...executionStateMap,
        [action.futureId]: updatedExecutionState,
      };
    }

    if (action.subtype === "send-data") {
      const updatedExecutionState: SendDataExecutionState = {
        ...(previousDeploymentExecutionState as SendDataExecutionState),
        status: ExecutionStatus.SUCCESS,
        txId: action.txId,
      };

      return {
        ...executionStateMap,
        [action.futureId]: updatedExecutionState,
      };
    }

    if (action.subtype === "contract-at") {
      const updatedExecutionState: ContractAtExecutionState = {
        ...(previousDeploymentExecutionState as ContractAtExecutionState),
        status: ExecutionStatus.SUCCESS,
        contractAddress: action.contractAddress,
        contractName: action.contractName,
      };

      return {
        ...executionStateMap,
        [action.futureId]: updatedExecutionState,
      };
    }

    throw new Error(
      "TBD - only deployment and call states are currently implemented for execution success"
    );
  }

  if (isExecutionFailure(action)) {
    const failedExState = executionStateMap[action.futureId];

    return {
      ...executionStateMap,
      [action.futureId]: {
        ...failedExState,
        status: ExecutionStatus.FAILED,
      },
    };
  }

  if (isTransactionMessage(action)) {
    const previousExState = executionStateMap[action.futureId];

    assertIgnitionInvariant(
      previousExState !== undefined,
      "On chain message for nonexistant future"
    );

    const updateWithOnchainAction: ExecutionState = {
      ...previousExState,
      history: [...previousExState.history, action],
      onchain: onchainActionReducer(previousExState.onchain, action),
    };

    return {
      ...executionStateMap,
      [action.futureId]: updateWithOnchainAction,
    };
  }

  if (action.type === "wipe") {
    const updated = {
      ...executionStateMap,
    };

    delete updated[action.futureId];

    return updated;
  }

  return executionStateMap;
}

function initialiseExecutionStateFor(
  futureStart: FutureStartMessage
): ExecutionState {
  if (isDeployContractStartMessage(futureStart)) {
    const executionState: DeploymentExecutionState = {
      id: futureStart.futureId,
      futureType: futureStart.futureType,
      strategy: futureStart.strategy,
      status: ExecutionStatus.STARTED,
      dependencies: new Set(futureStart.dependencies),
      history: [],
      onchain: {
        status: OnchainStatuses.EXECUTE,
        currentExecution: null,
        actions: {},
      },
      storedArtifactPath: futureStart.storedArtifactPath,
      storedBuildInfoPath: futureStart.storedBuildInfoPath,
      contractName: futureStart.contractName,
      value: BigInt(futureStart.value),
      constructorArgs: futureStart.constructorArgs,
      libraries: futureStart.libraries,
      from: futureStart.from,
    };

    return executionState;
  }

  if (isCallFunctionStartMessage(futureStart)) {
    const executionState: CallExecutionState = {
      id: futureStart.futureId,
      futureType: futureStart.futureType,
      strategy: futureStart.strategy,
      status: ExecutionStatus.STARTED,
      dependencies: new Set(futureStart.dependencies),
      history: [],
      onchain: {
        status: OnchainStatuses.EXECUTE,
        currentExecution: null,
        actions: {},
      },
      contractAddress: futureStart.contractAddress,
      storedArtifactPath: futureStart.storedArtifactPath,
      args: futureStart.args,
      from: futureStart.from,
      functionName: futureStart.functionName,
      value: BigInt(futureStart.value),
    };

    return executionState;
  }

  if (isStaticCallStartMessage(futureStart)) {
    const executionState: StaticCallExecutionState = {
      id: futureStart.futureId,
      futureType: futureStart.futureType,
      strategy: futureStart.strategy,
      status: ExecutionStatus.STARTED,
      dependencies: new Set(futureStart.dependencies),
      history: [],
      onchain: {
        status: OnchainStatuses.EXECUTE,
        currentExecution: null,
        actions: {},
      },
      contractAddress: futureStart.contractAddress,
      storedArtifactPath: futureStart.storedArtifactPath,
      args: futureStart.args,
      from: futureStart.from,
      functionName: futureStart.functionName,
    };

    return executionState;
  }

  if (isReadEventArgumentStartMessage(futureStart)) {
    const executionState: ReadEventArgumentExecutionState = {
      id: futureStart.futureId,
      futureType: futureStart.futureType,
      strategy: futureStart.strategy,
      status: ExecutionStatus.STARTED,
      dependencies: new Set(futureStart.dependencies),
      history: [],
      onchain: {
        status: OnchainStatuses.EXECUTE,
        currentExecution: null,
        actions: {},
      },
      storedArtifactPath: futureStart.storedArtifactPath,
      eventName: futureStart.eventName,
      argumentName: futureStart.argumentName,
      txToReadFrom: futureStart.txToReadFrom,
      emitterAddress: futureStart.emitterAddress,
      eventIndex: futureStart.eventIndex,
    };

    return executionState;
  }

  if (isSendDataStartMessage(futureStart)) {
    const executionState: SendDataExecutionState = {
      id: futureStart.futureId,
      futureType: futureStart.futureType,
      strategy: futureStart.strategy,
      status: ExecutionStatus.STARTED,
      dependencies: new Set(futureStart.dependencies),
      history: [],
      onchain: {
        status: OnchainStatuses.EXECUTE,
        currentExecution: null,
        actions: {},
      },
      value: BigInt(futureStart.value),
      data: futureStart.data,
      to: futureStart.to,
      from: futureStart.from,
    };

    return executionState;
  }

  if (isContractAtStartMessage(futureStart)) {
    const executionState: ContractAtExecutionState = {
      id: futureStart.futureId,
      futureType: futureStart.futureType,
      strategy: futureStart.strategy,
      status: ExecutionStatus.STARTED,
      dependencies: new Set(futureStart.dependencies),
      history: [],
      onchain: {
        status: OnchainStatuses.EXECUTE,
        currentExecution: null,
        actions: {},
      },
      storedArtifactPath: futureStart.storedArtifactPath,
      contractAddress: futureStart.contractAddress,
      contractName: futureStart.contractName,
    };

    return executionState;
  }

  throw new Error("Not implemented yet in the reducer");
}
