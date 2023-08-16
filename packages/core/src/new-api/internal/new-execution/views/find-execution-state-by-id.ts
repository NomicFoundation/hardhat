import { assertIgnitionInvariant } from "../../utils/assertions";
import { DeploymentState } from "../types/deployment-state";
import {
  CallExecutionState,
  ContractAtExecutionState,
  DeploymentExecutionState,
  ExecutionSateType,
  ReadEventArgumentExecutionState,
  SendDataExecutionState,
  StaticCallExecutionState,
} from "../types/execution-state";

type MapExStateTypeToExState<ExStateT extends ExecutionSateType> =
  ExStateT extends ExecutionSateType.DEPLOYMENT_EXECUTION_STATE
    ? DeploymentExecutionState
    : ExStateT extends ExecutionSateType.CALL_EXECUTION_STATE
    ? CallExecutionState
    : ExStateT extends ExecutionSateType.STATIC_CALL_EXECUTION_STATE
    ? StaticCallExecutionState
    : ExStateT extends ExecutionSateType.SEND_DATA_EXECUTION_STATE
    ? SendDataExecutionState
    : ExStateT extends ExecutionSateType.CONTRACT_AT_EXECUTION_STATE
    ? ContractAtExecutionState
    : ExStateT extends ExecutionSateType.READ_EVENT_ARGUMENT_EXECUTION_STATE
    ? ReadEventArgumentExecutionState
    : never;

export function findExecutionStateById<ExStateT extends ExecutionSateType>(
  exStateType: ExStateT,
  deployment: DeploymentState,
  futureId: string
): MapExStateTypeToExState<ExStateT> {
  const exState = deployment.executionStates[futureId];

  assertIgnitionInvariant(
    exState !== undefined,
    `Expected execution state for ${futureId} to exist, but it did not`
  );

  assertIgnitionInvariant(
    exState.type === exStateType,
    `Expected execution state for ${futureId} to be a ${exStateType}, but instead it was ${exState.type}`
  );

  return exState as MapExStateTypeToExState<ExStateT>;
}
