import type { DeploymentState } from "../execution/types/deployment-state";

import { ExecutionResultType } from "../execution/types/execution-result";
import { ExecutionSateType } from "../execution/types/execution-state";
import { assertIgnitionInvariant } from "../utils/assertions";

/**
 * Find the address for the future by its id. Only works for ContractAt, NamedLibrary,
 * NamedContract, ArtifactLibrary, ArtifactContract as only they result in an
 * address on completion.
 *
 * Assumes that the future has been completed.
 *
 * @param deploymentState
 * @param futureId
 * @returns
 */
export function findAddressForContractFuture(
  deploymentState: DeploymentState,
  futureId: string,
): string {
  const exState = deploymentState.executionStates[futureId];

  assertIgnitionInvariant(
    exState !== undefined,
    `Expected execution state for ${futureId} to exist, but it did not`,
  );

  assertIgnitionInvariant(
    exState.type === ExecutionSateType.DEPLOYMENT_EXECUTION_STATE ||
      exState.type === ExecutionSateType.CONTRACT_AT_EXECUTION_STATE,
    `Can only resolve an address for a ContractAt, NamedLibrary, NamedContract, ArtifactLibrary, ArtifactContract`,
  );

  if (exState.type === ExecutionSateType.CONTRACT_AT_EXECUTION_STATE) {
    return exState.contractAddress;
  }

  assertIgnitionInvariant(
    exState.result !== undefined,
    `Expected execution state for ${futureId} to have a result, but it did not`,
  );

  assertIgnitionInvariant(
    exState.result.type === ExecutionResultType.SUCCESS,
    `Cannot access the result of ${futureId}, it was not a deployment success`,
  );

  return exState.result.address;
}
