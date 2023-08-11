import {
  CallExecutionState,
  ContractAtExecutionState,
  DeploymentExecutionState,
  ExecutionSateType,
  ExecutionState,
  SendDataExecutionState,
  StaticCallExecutionState,
} from "../types/execution-state";

export function isExecutionState(
  potential: unknown
): potential is DeploymentExecutionState {
  return (
    isDeploymentExecutionState(potential) ||
    isCallExecutionState(potential) ||
    isStaticCallExecutionState(potential) ||
    isContractAtExecutionState(potential) ||
    isReadEventArgumentExecutionState(potential) ||
    isSendDataExecutionState(potential)
  );
}

export function isDeploymentExecutionState(
  potential: unknown
): potential is DeploymentExecutionState {
  return (
    _isExecutionState(potential) &&
    potential.type === ExecutionSateType.DEPLOYMENT_EXECUTION_STATE
  );
}

export function isCallExecutionState(
  potential: unknown
): potential is CallExecutionState {
  return (
    _isExecutionState(potential) &&
    potential.type === ExecutionSateType.CALL_EXECUTION_STATE
  );
}

export function isStaticCallExecutionState(
  potential: unknown
): potential is StaticCallExecutionState {
  return (
    _isExecutionState(potential) &&
    potential.type === ExecutionSateType.STATIC_CALL_EXECUTION_STATE
  );
}

export function isContractAtExecutionState(
  potential: unknown
): potential is ContractAtExecutionState {
  return (
    _isExecutionState(potential) &&
    potential.type === ExecutionSateType.CONTRACT_AT_EXECUTION_STATE
  );
}

export function isReadEventArgumentExecutionState(
  potential: unknown
): potential is ContractAtExecutionState {
  return (
    _isExecutionState(potential) &&
    potential.type === ExecutionSateType.READ_EVENT_ARGUMENT_EXECUTION_STATE
  );
}

export function isSendDataExecutionState(
  potential: unknown
): potential is SendDataExecutionState {
  return (
    _isExecutionState(potential) &&
    potential.type === ExecutionSateType.SEND_DATA_EXECUTION_STATE
  );
}

function _isExecutionState(potential: unknown): potential is ExecutionState {
  return (
    typeof potential === "object" && potential !== null && "type" in potential
  );
}
