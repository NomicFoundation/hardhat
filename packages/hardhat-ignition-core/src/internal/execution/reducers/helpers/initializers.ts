import { FutureType } from "../../../../types/module";
import {
  CallExecutionState,
  ContractAtExecutionState,
  DeploymentExecutionState,
  EncodeFunctionCallExecutionState,
  ExecutionStateType,
  ExecutionStatus,
  ReadEventArgumentExecutionState,
  SendDataExecutionState,
  StaticCallExecutionState,
} from "../../types/execution-state";
import {
  CallExecutionStateInitializeMessage,
  ContractAtExecutionStateInitializeMessage,
  DeploymentExecutionStateInitializeMessage,
  EncodeFunctionCallExecutionStateInitializeMessage,
  ReadEventArgExecutionStateInitializeMessage,
  SendDataExecutionStateInitializeMessage,
  StaticCallExecutionStateInitializeMessage,
} from "../../types/messages";

export function initialiseDeploymentExecutionStateFrom(
  action: DeploymentExecutionStateInitializeMessage
): DeploymentExecutionState {
  const deploymentExecutionInitialState: DeploymentExecutionState = {
    id: action.futureId,
    type: ExecutionStateType.DEPLOYMENT_EXECUTION_STATE,
    futureType: action.futureType,
    strategy: action.strategy,
    strategyConfig: action.strategyConfig,
    status: ExecutionStatus.STARTED,
    dependencies: new Set<string>(action.dependencies),
    artifactId: action.artifactId,
    contractName: action.contractName,
    constructorArgs: action.constructorArgs,
    libraries: action.libraries,
    value: action.value,
    from: action.from,
    networkInteractions: [],
  };

  return deploymentExecutionInitialState;
}

export function initialiseStaticCallExecutionStateFrom(
  action: StaticCallExecutionStateInitializeMessage
): StaticCallExecutionState {
  const callExecutionInitialState: StaticCallExecutionState = {
    id: action.futureId,
    type: ExecutionStateType.STATIC_CALL_EXECUTION_STATE,
    futureType: FutureType.STATIC_CALL,
    strategy: action.strategy,
    strategyConfig: action.strategyConfig,
    status: ExecutionStatus.STARTED,
    dependencies: new Set<string>(action.dependencies),
    artifactId: action.artifactId,
    contractAddress: action.contractAddress,
    functionName: action.functionName,
    args: action.args,
    nameOrIndex: action.nameOrIndex,
    from: action.from,
    networkInteractions: [],
  };

  return callExecutionInitialState;
}

export function initialiseSendDataExecutionStateFrom(
  action: SendDataExecutionStateInitializeMessage
): SendDataExecutionState {
  const callExecutionInitialState: SendDataExecutionState = {
    id: action.futureId,
    type: ExecutionStateType.SEND_DATA_EXECUTION_STATE,
    futureType: FutureType.SEND_DATA,
    strategy: action.strategy,
    strategyConfig: action.strategyConfig,
    status: ExecutionStatus.STARTED,
    dependencies: new Set<string>(action.dependencies),
    to: action.to,
    data: action.data,
    value: action.value,
    from: action.from,
    networkInteractions: [],
  };

  return callExecutionInitialState;
}

export function initialiseReadEventArgumentExecutionStateFrom(
  action: ReadEventArgExecutionStateInitializeMessage
): ReadEventArgumentExecutionState {
  const readEventArgumentExecutionInitialState: ReadEventArgumentExecutionState =
    {
      id: action.futureId,
      type: ExecutionStateType.READ_EVENT_ARGUMENT_EXECUTION_STATE,
      futureType: FutureType.READ_EVENT_ARGUMENT,
      strategy: action.strategy,
      strategyConfig: action.strategyConfig,
      status: ExecutionStatus.SUCCESS,
      dependencies: new Set<string>(action.dependencies),
      artifactId: action.artifactId,
      eventName: action.eventName,
      nameOrIndex: action.nameOrIndex,
      txToReadFrom: action.txToReadFrom,
      emitterAddress: action.emitterAddress,
      eventIndex: action.eventIndex,
      result: action.result,
    };

  return readEventArgumentExecutionInitialState;
}

export function initialiseContractAtExecutionStateFrom(
  action: ContractAtExecutionStateInitializeMessage
): ContractAtExecutionState {
  const contractAtExecutionInitialState: ContractAtExecutionState = {
    id: action.futureId,
    type: ExecutionStateType.CONTRACT_AT_EXECUTION_STATE,
    futureType: action.futureType,
    strategy: action.strategy,
    strategyConfig: action.strategyConfig,
    status: ExecutionStatus.SUCCESS,
    dependencies: new Set<string>(action.dependencies),
    artifactId: action.artifactId,
    contractName: action.contractName,
    contractAddress: action.contractAddress,
  };

  return contractAtExecutionInitialState;
}

export function initialiseEncodeFunctionCallExecutionStateFrom(
  action: EncodeFunctionCallExecutionStateInitializeMessage
): EncodeFunctionCallExecutionState {
  const encodeFunctionCallExecutionInitialState: EncodeFunctionCallExecutionState =
    {
      id: action.futureId,
      type: ExecutionStateType.ENCODE_FUNCTION_CALL_EXECUTION_STATE,
      futureType: FutureType.ENCODE_FUNCTION_CALL,
      strategy: action.strategy,
      strategyConfig: action.strategyConfig,
      status: ExecutionStatus.SUCCESS,
      dependencies: new Set<string>(action.dependencies),
      artifactId: action.artifactId,
      functionName: action.functionName,
      args: action.args,
      result: action.result,
    };

  return encodeFunctionCallExecutionInitialState;
}

export function initialiseCallExecutionStateFrom(
  action: CallExecutionStateInitializeMessage
): CallExecutionState {
  const callExecutionInitialState: CallExecutionState = {
    id: action.futureId,
    type: ExecutionStateType.CALL_EXECUTION_STATE,
    futureType: FutureType.CONTRACT_CALL,
    strategy: action.strategy,
    strategyConfig: action.strategyConfig,
    status: ExecutionStatus.STARTED,
    dependencies: new Set<string>(action.dependencies),
    artifactId: action.artifactId,
    contractAddress: action.contractAddress,
    functionName: action.functionName,
    args: action.args,
    value: action.value,
    from: action.from,
    networkInteractions: [],
  };

  return callExecutionInitialState;
}
