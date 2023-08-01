import { every } from "lodash";

import { FutureType } from "../types/module";

import {
  CallExecutionState,
  ContractAtExecutionState,
  DeploymentExecutionState,
  ExecutionState,
  ReadEventArgumentExecutionState,
  SendDataExecutionState,
  StaticCallExecutionState,
} from "./execution/types";

export function isDeploymentExecutionState(
  executionState: ExecutionState
): executionState is DeploymentExecutionState {
  return [
    FutureType.NAMED_CONTRACT_DEPLOYMENT,
    FutureType.ARTIFACT_CONTRACT_DEPLOYMENT,
    FutureType.NAMED_LIBRARY_DEPLOYMENT,
    FutureType.ARTIFACT_LIBRARY_DEPLOYMENT,
  ].includes(executionState.futureType);
}

export function isCallExecutionState(
  executionState: ExecutionState
): executionState is CallExecutionState {
  return [FutureType.NAMED_CONTRACT_CALL].includes(executionState.futureType);
}

export function isStaticCallExecutionState(
  executionState: ExecutionState
): executionState is StaticCallExecutionState {
  return [FutureType.NAMED_STATIC_CALL].includes(executionState.futureType);
}

export function isReadEventArgumentExecutionState(
  executionState: ExecutionState
): executionState is ReadEventArgumentExecutionState {
  return [FutureType.READ_EVENT_ARGUMENT].includes(executionState.futureType);
}

export function isContractAtExecutionState(
  executionState: ExecutionState
): executionState is ContractAtExecutionState {
  return [
    FutureType.NAMED_CONTRACT_AT,
    FutureType.ARTIFACT_CONTRACT_AT,
  ].includes(executionState.futureType);
}

export function isSendDataExecutionState(
  executionState: ExecutionState
): executionState is SendDataExecutionState {
  return [FutureType.SEND_DATA].includes(executionState.futureType);
}

export function isContractExecutionStateArray(
  executionStateArray: ExecutionState[]
): executionStateArray is Array<
  DeploymentExecutionState | ContractAtExecutionState
> {
  return every(
    executionStateArray,
    (state) =>
      isDeploymentExecutionState(state) || isContractAtExecutionState(state)
  );
}
