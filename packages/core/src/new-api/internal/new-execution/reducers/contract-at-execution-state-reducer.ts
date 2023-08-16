import {
  ContractAtExecutionState,
  ExecutionSateType,
  ExecutionStatus,
} from "../types/execution-state";
import {
  ContractAtExecutionStateInitializeMessage,
  JournalMessageType,
} from "../types/messages";

export function contractAtExecutionStateReducer(
  _state: ContractAtExecutionState,
  action: ContractAtExecutionStateInitializeMessage
): ContractAtExecutionState {
  switch (action.type) {
    case JournalMessageType.CONTRACT_AT_EXECUTION_STATE_INITIALIZE:
      return initialiseContractAtExecutionStateFrom(action);
  }
}

function initialiseContractAtExecutionStateFrom(
  action: ContractAtExecutionStateInitializeMessage
): ContractAtExecutionState {
  const contractAtExecutionInitialState: ContractAtExecutionState = {
    id: action.futureId,
    type: ExecutionSateType.CONTRACT_AT_EXECUTION_STATE,
    futureType: action.futureType,
    strategy: action.strategy,
    status: ExecutionStatus.SUCCESS,
    dependencies: new Set<string>(action.dependencies),
    artifactFutureId: action.artifactFutureId,
    contractName: action.contractName,
    contractAddress: action.contractAddress,
  };

  return contractAtExecutionInitialState;
}
