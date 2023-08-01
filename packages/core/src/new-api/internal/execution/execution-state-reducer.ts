import { IgnitionError } from "../../../errors";
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
} from "../execution/types";
import {
  isCallFunctionStartMessage,
  isContractAtStartMessage,
  isDeployContractStartMessage,
  isFutureStartMessage,
  isReadEventArgumentStartMessage,
  isSendDataStartMessage,
  isStartRunMessage,
  isStaticCallStartMessage,
  isTransactionMessage,
  isWipeMessage,
} from "../journal/type-guards";
import { FutureStartMessage, JournalableMessage } from "../journal/types";
import { assertIgnitionInvariant } from "../utils/assertions";

import {
  isExecutionFailure,
  isExecutionHold,
  isExecutionSuccess,
  isExecutionTimeout,
} from "./guards";
import { onchainActionReducer } from "./onchain-action-reducer";

export function executionStateReducer(
  executionStateMap: ExecutionStateMap,
  action: JournalableMessage
): ExecutionStateMap {
  if (isStartRunMessage(action)) {
    return setTimeoutFuturesToStarted(executionStateMap);
  }

  if (isFutureStartMessage(action)) {
    return {
      ...executionStateMap,
      [action.futureId]: initialiseExecutionStateFor(action),
    };
  }

  if (isExecutionSuccess(action)) {
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

    return assertUnknownMessageType(action);
  }

  if (isExecutionTimeout(action)) {
    const failedExState = executionStateMap[action.futureId];

    return {
      ...executionStateMap,
      [action.futureId]: {
        ...failedExState,
        status: ExecutionStatus.TIMEOUT,
      },
    };
  }

  if (isExecutionHold(action)) {
    const failedExState = executionStateMap[action.futureId];

    return {
      ...executionStateMap,
      [action.futureId]: {
        ...failedExState,
        status: ExecutionStatus.HOLD,
      },
    };
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

  if (isWipeMessage(action)) {
    const updated = {
      ...executionStateMap,
    };

    delete updated[action.futureId];

    return updated;
  }

  return assertUnknownMessageType(action);
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
        from: null,
        nonce: null,
        txHash: null,
      },
      artifactFutureId: futureStart.artifactFutureId,
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
        from: null,
        nonce: null,
        txHash: null,
      },
      contractAddress: futureStart.contractAddress,
      artifactFutureId: futureStart.artifactFutureId,
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
        from: null,
        nonce: null,
        txHash: null,
      },
      contractAddress: futureStart.contractAddress,
      artifactFutureId: futureStart.artifactFutureId,
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
        from: null,
        nonce: null,
        txHash: null,
      },
      artifactFutureId: futureStart.artifactFutureId,
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
        from: null,
        nonce: null,
        txHash: null,
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
        from: null,
        nonce: null,
        txHash: null,
      },
      artifactFutureId: futureStart.artifactFutureId,
      contractAddress: futureStart.contractAddress,
      contractName: futureStart.contractName,
    };

    return executionState;
  }

  return assertUnknownMessageType(futureStart);
}

/**
 * Update the timed out futures to be started so they can be rerun
 * @param executionStateMap - the execution states of all seen futures
 * @returns the execution states with timed out futures moved back to started
 */
function setTimeoutFuturesToStarted(
  executionStateMap: ExecutionStateMap
): ExecutionStateMap {
  return Object.fromEntries(
    Object.entries(executionStateMap).map(([futureId, exState]) => [
      futureId,
      exState.status === ExecutionStatus.TIMEOUT
        ? { ...exState, status: ExecutionStatus.STARTED }
        : exState,
    ])
  );
}

function assertUnknownMessageType(message: never): any {
  throw new IgnitionError(`Unknown message type${JSON.stringify(message)}`);
}
