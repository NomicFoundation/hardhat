import { assertIgnitionInvariant } from "../../utils/assertions";
import { DeploymentState } from "../types/deployment-state";
import {
  ContractAtExecutionState,
  ExecutionSateType,
} from "../types/execution-state";

export function findContractAtExecutionStateBy(
  deployment: DeploymentState,
  futureId: string
): ContractAtExecutionState {
  const exState = deployment.executionStates[futureId];

  assertIgnitionInvariant(
    exState !== undefined,
    `Expected execution state for ${futureId} to exist, but it did not`
  );

  assertIgnitionInvariant(
    exState.type === ExecutionSateType.CONTRACT_AT_EXECUTION_STATE,
    `Expected execution state for ${futureId} to be a contract at execution state, but instead it was ${exState.type}`
  );

  return exState;
}
