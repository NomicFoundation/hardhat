import type {
  CalledFunctionExecutionSuccess,
  ContractAtExecutionSuccess,
  DeployedContractExecutionSuccess,
  ExecutionSuccess,
  JournalableMessage,
  ReadEventArgumentExecutionSuccess,
  SendDataExecutionSuccess,
  StaticCallExecutionSuccess,
} from "../../types";

export function isExecutionSuccess(
  potential: JournalableMessage
): potential is ExecutionSuccess {
  return (
    isDeployedContractExecutionSuccess(potential) ||
    isCalledFunctionExecutionSuccess(potential) ||
    isStaticCallExecutionSuccess(potential) ||
    isReadEventArgumentExecutionSuccess(potential) ||
    isSendDataExecutionSuccess(potential) ||
    isContractAtExecutionSuccess(potential)
  );
}

export function isDeployedContractExecutionSuccess(
  potential: JournalableMessage
): potential is DeployedContractExecutionSuccess {
  return (
    _isTypeExecutionSuccess(potential) &&
    potential.subtype === "deploy-contract"
  );
}

export function isCalledFunctionExecutionSuccess(
  potential: JournalableMessage
): potential is CalledFunctionExecutionSuccess {
  return (
    _isTypeExecutionSuccess(potential) && potential.subtype === "call-function"
  );
}

export function isStaticCallExecutionSuccess(
  potential: JournalableMessage
): potential is StaticCallExecutionSuccess {
  return (
    _isTypeExecutionSuccess(potential) && potential.subtype === "static-call"
  );
}

export function isReadEventArgumentExecutionSuccess(
  potential: JournalableMessage
): potential is ReadEventArgumentExecutionSuccess {
  return (
    _isTypeExecutionSuccess(potential) && potential.subtype === "read-event-arg"
  );
}

export function isSendDataExecutionSuccess(
  potential: JournalableMessage
): potential is SendDataExecutionSuccess {
  return (
    _isTypeExecutionSuccess(potential) && potential.subtype === "send-data"
  );
}

export function isContractAtExecutionSuccess(
  potential: JournalableMessage
): potential is ContractAtExecutionSuccess {
  return (
    _isTypeExecutionSuccess(potential) && potential.subtype === "contract-at"
  );
}

function _isTypeExecutionSuccess(
  potential: JournalableMessage
): potential is ExecutionSuccess {
  return potential.type === "execution-success";
}
