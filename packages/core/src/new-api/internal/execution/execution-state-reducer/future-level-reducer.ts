import {
  isCallFunctionStartMessage,
  isCalledFunctionExecutionSuccess,
  isContractAtExecutionSuccess,
  isContractAtStartMessage,
  isDeployContractStartMessage,
  isDeployedContractExecutionSuccess,
  isExecutionFailure,
  isExecutionHold,
  isExecutionSuccess,
  isExecutionTimeout,
  isFutureStartMessage,
  isReadEventArgumentExecutionSuccess,
  isReadEventArgumentStartMessage,
  isSendDataExecutionSuccess,
  isSendDataStartMessage,
  isStaticCallExecutionSuccess,
  isStaticCallStartMessage,
} from "../../journal/type-guards";
import {
  ExecutionSuccess,
  FutureLevelJournalMessage,
  FutureStartMessage,
} from "../../journal/types";
import {
  isCallExecutionState,
  isContractAtExecutionState,
  isDeploymentExecutionState,
  isReadEventArgumentExecutionState,
  isSendDataExecutionState,
  isStaticCallExecutionState,
} from "../../type-guards";
import { assertIgnitionInvariant } from "../../utils/assertions";
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
} from "../types";

import { assertUnknownMessageType } from "./utils";

export function futureLevelReducer(
  executionStateMap: ExecutionStateMap,
  action: FutureLevelJournalMessage
): ExecutionStateMap {
  const previousDeploymentExecutionState = executionStateMap[action.futureId];

  const updatedExecutionState = updateExecutionState(
    previousDeploymentExecutionState,
    action
  );

  return {
    ...executionStateMap,
    [action.futureId]: updatedExecutionState,
  };
}

function updateExecutionState(
  executionState: ExecutionState,
  action: FutureLevelJournalMessage
): ExecutionState {
  if (isFutureStartMessage(action)) {
    return initialiseExecutionStateFor(action);
  }

  if (isExecutionSuccess(action)) {
    return setSuccess(executionState, action);
  }

  if (isExecutionTimeout(action)) {
    return setStatus(executionState, ExecutionStatus.TIMEOUT);
  }

  if (isExecutionHold(action)) {
    return setStatus(executionState, ExecutionStatus.HOLD);
  }

  if (isExecutionFailure(action)) {
    return setStatus(executionState, ExecutionStatus.FAILED);
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

function setSuccess(
  previousExecutionState: ExecutionState,
  action: ExecutionSuccess
): ExecutionState {
  if (isDeployedContractExecutionSuccess(action)) {
    assertIgnitionInvariant(
      isDeploymentExecutionState(previousExecutionState),
      `DeployedContractExecutionSuccess cannot update an execution state of future type ${previousExecutionState.futureType}`
    );

    return safeSuccessUpdate(previousExecutionState, {
      contractAddress: action.contractAddress,
      txId: action.txId,
    });
  }

  if (isCalledFunctionExecutionSuccess(action)) {
    assertIgnitionInvariant(
      isCallExecutionState(previousExecutionState),
      `CalledFunctionExecutionSuccess cannot update an execution state of future type ${previousExecutionState.futureType}`
    );

    return safeSuccessUpdate(previousExecutionState, {
      txId: action.txId,
    });
  }

  if (isStaticCallExecutionSuccess(action)) {
    assertIgnitionInvariant(
      isStaticCallExecutionState(previousExecutionState),
      `StaticCallExecutionSuccess cannot update an execution state of future type ${previousExecutionState.futureType}`
    );

    return safeSuccessUpdate(previousExecutionState, {
      result: action.result,
    });
  }

  if (isReadEventArgumentExecutionSuccess(action)) {
    assertIgnitionInvariant(
      isReadEventArgumentExecutionState(previousExecutionState),
      `ReadEventArgumentExecutionSuccess cannot update an execution state of future type ${previousExecutionState.futureType}`
    );

    return safeSuccessUpdate(previousExecutionState, {
      result: action.result,
    });
  }

  if (isSendDataExecutionSuccess(action)) {
    assertIgnitionInvariant(
      isSendDataExecutionState(previousExecutionState),
      `SendDataExecutionSuccess cannot update an execution state of future type ${previousExecutionState.futureType}`
    );

    return safeSuccessUpdate(previousExecutionState, {
      txId: action.txId,
    });
  }

  if (isContractAtExecutionSuccess(action)) {
    assertIgnitionInvariant(
      isContractAtExecutionState(previousExecutionState),
      `ContractAtExecutionSuccess cannot update an execution state of future type ${previousExecutionState.futureType}`
    );

    return safeSuccessUpdate(previousExecutionState, {
      contractAddress: action.contractAddress,
      contractName: action.contractName,
    });
  }

  return assertUnknownMessageType(action);
}

function setStatus(
  executionState: ExecutionState,
  status: ExecutionStatus
): ExecutionState {
  return {
    ...executionState,
    status,
  };
}

interface SuccessUpdateMapping {
  DeployedContractExecutionSuccess: Required<
    Pick<DeploymentExecutionState, "contractAddress" | "txId">
  >;
  CallExecutionState: Required<Pick<CallExecutionState, "txId">>;
  StaticCallExecutionState: Required<Pick<StaticCallExecutionState, "result">>;
  ReadEventArgumentExecutionState: Required<
    Pick<StaticCallExecutionState, "result">
  >;
  SendDataExecutionState: Required<Pick<SendDataExecutionState, "txId">>;
  ContractAtExecutionState: Required<
    Pick<ContractAtExecutionState, "contractAddress" | "contractName">
  >;
}

type SuccessUpdateFor<Message extends ExecutionState> =
  Message extends DeploymentExecutionState
    ? SuccessUpdateMapping["DeployedContractExecutionSuccess"]
    : Message extends CallExecutionState
    ? SuccessUpdateMapping["CallExecutionState"]
    : Message extends StaticCallExecutionState
    ? SuccessUpdateMapping["StaticCallExecutionState"]
    : Message extends ReadEventArgumentExecutionState
    ? SuccessUpdateMapping["ReadEventArgumentExecutionState"]
    : Message extends SendDataExecutionState
    ? SuccessUpdateMapping["SendDataExecutionState"]
    : Message extends ContractAtExecutionState
    ? SuccessUpdateMapping["ContractAtExecutionState"]
    : never;

function safeSuccessUpdate<TExState extends ExecutionState>(
  previousExecutionState: TExState,
  update: SuccessUpdateFor<TExState>
): TExState {
  const updated: TExState = {
    ...previousExecutionState,
    status: ExecutionStatus.SUCCESS,
    ...update,
  };

  return updated;
}
