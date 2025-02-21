import { SolidityParameterType } from "../../types/module";
import { DeploymentState } from "../execution/types/deployment-state";
import { ExecutionResultType } from "../execution/types/execution-result";
import { ExecutionStateType } from "../execution/types/execution-state";
import { assertIgnitionInvariant } from "../utils/assertions";

export function findResultForFutureById(
  deploymentState: DeploymentState,
  futureId: string
): SolidityParameterType {
  const exState = deploymentState.executionStates[futureId];

  assertIgnitionInvariant(
    exState !== undefined,
    `Expected execution state for ${futureId} to exist, but it did not`
  );

  assertIgnitionInvariant(
    exState.type === ExecutionStateType.DEPLOYMENT_EXECUTION_STATE ||
      exState.type === ExecutionStateType.STATIC_CALL_EXECUTION_STATE ||
      exState.type === ExecutionStateType.CONTRACT_AT_EXECUTION_STATE ||
      exState.type === ExecutionStateType.READ_EVENT_ARGUMENT_EXECUTION_STATE ||
      exState.type === ExecutionStateType.ENCODE_FUNCTION_CALL_EXECUTION_STATE,
    `Expected execution state for ${futureId} to be support result lookup, but instead it was ${exState.type}`
  );

  if (exState.type === ExecutionStateType.CONTRACT_AT_EXECUTION_STATE) {
    return exState.contractAddress;
  }

  assertIgnitionInvariant(
    exState.result !== undefined,
    `Expected execution state for ${futureId} to have a result, but it did not`
  );

  if (
    exState.type === ExecutionStateType.READ_EVENT_ARGUMENT_EXECUTION_STATE ||
    exState.type === ExecutionStateType.ENCODE_FUNCTION_CALL_EXECUTION_STATE
  ) {
    return exState.result;
  }

  assertIgnitionInvariant(
    exState.result.type === ExecutionResultType.SUCCESS,
    `Cannot access the result of ${futureId}, it was not a deployment success or static call success`
  );

  switch (exState.type) {
    case ExecutionStateType.DEPLOYMENT_EXECUTION_STATE:
      return exState.result.address;
    case ExecutionStateType.STATIC_CALL_EXECUTION_STATE: {
      return exState.result.value;
    }
  }
}
