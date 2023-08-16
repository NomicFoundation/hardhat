import {
  ContractAtExecutionState,
  ExecutionSateType,
  ExecutionStatus,
} from "../types/execution-state";
import { ContractAtExecutionStateInitializeMessage } from "../types/messages";

export function initialiseContractAtExecutionStateFrom(
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
