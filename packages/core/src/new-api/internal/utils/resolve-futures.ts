import { IgnitionError } from "../../../errors";
import { Future, SolidityParameterType } from "../../types/module";
import { ExecutionState, ExecutionStateMap } from "../execution/types";
import {
  isCallExecutionState,
  isContractAtExecutionState,
  isDeploymentExecutionState,
  isReadEventArgumentExecutionState,
  isSendDataExecutionState,
  isStaticCallExecutionState,
} from "../type-guards";

import { assertIgnitionInvariant } from "./assertions";

/**
 * Resolve a future to its value for execution. This will depend on the future
 * type, so a contract deploy will resolve to its address.
 *
 * @param future
 * @param context
 */
export function resolveContractFutureToAddress(
  future: Future,
  context: { executionStateMap: ExecutionStateMap }
): string {
  const executionState = _resolveFromExecutionState(
    future,
    context.executionStateMap
  );

  assertIgnitionInvariant(
    isDeploymentExecutionState(executionState) ||
      isContractAtExecutionState(executionState),
    `Cannot only resolve an address for a ContractAt, NamedLibrary, NamedContract, ArtifactLibrary, ArtifactContract`
  );

  if (isContractAtExecutionState(executionState)) {
    return executionState.contractAddress;
  }

  if (isDeploymentExecutionState(executionState)) {
    assertIgnitionInvariant(
      executionState.contractAddress !== undefined,
      `Future ${future.id} does not have a contract address`
    );

    return executionState.contractAddress;
  }

  return _assertNeverExecutionState(executionState);
}

/**
 * Resolve a future to its value for execution. This will depend on the future
 * type, so a contract deploy will resolve to its address.
 *
 * @param future
 * @param context
 */
export function resolveFutureToValue(
  future: Future,
  context: { executionStateMap: ExecutionStateMap }
): SolidityParameterType {
  const executionState = _resolveFromExecutionState(
    future,
    context.executionStateMap
  );

  assertIgnitionInvariant(
    !isCallExecutionState(executionState),
    `Calls cannot be resolved to values`
  );

  assertIgnitionInvariant(
    !isSendDataExecutionState(executionState),
    `Calls cannot be resolved to values`
  );

  if (isContractAtExecutionState(executionState)) {
    return executionState.contractAddress;
  }

  if (isDeploymentExecutionState(executionState)) {
    assertIgnitionInvariant(
      executionState.contractAddress !== undefined,
      `Future ${future.id} does not have a contract address`
    );

    return executionState.contractAddress;
  }

  if (isStaticCallExecutionState(executionState)) {
    assertIgnitionInvariant(
      executionState.result !== undefined,
      `Future ${future.id} does not have a result`
    );

    return executionState.result;
  }

  if (isReadEventArgumentExecutionState(executionState)) {
    assertIgnitionInvariant(
      executionState.result !== undefined,
      `Future ${future.id} does not have a result`
    );

    return executionState.result;
  }

  return _assertNeverExecutionState(executionState);
}

function _resolveFromExecutionState<
  TFuture extends Future,
  TExState extends ExecutionState
>(future: TFuture, executionStateMap: ExecutionStateMap): TExState {
  const executionState = executionStateMap[future.id] as TExState;

  assertIgnitionInvariant(
    executionState !== undefined,
    `Failure looking up execution state for future ${future.id}, there is no history of previous execution of this future`
  );
  assertIgnitionInvariant(
    future.type === executionState.futureType,
    `Execution state type does not match future for future ${future.id}`
  );

  return executionState;
}

function _assertNeverExecutionState<T>(_state: never): T {
  throw new IgnitionError("Unknown execution state");
}
