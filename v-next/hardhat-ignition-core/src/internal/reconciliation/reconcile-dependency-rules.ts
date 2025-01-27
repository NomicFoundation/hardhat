import type { ReconciliationFutureResult } from "./types.js";
import type { Future } from "../../types/module.js";
import type { DeploymentState } from "../execution/types/deployment-state.js";
import type { ExecutionState } from "../execution/types/execution-state.js";

import difference from "lodash/difference";

import { ExecutionStatus } from "../execution/types/execution-state.js";

import { fail } from "./utils.js";

export function reconcileDependencyRules(
  future: Future,
  executionState: ExecutionState,
  context: { deploymentState: DeploymentState },
): ReconciliationFutureResult {
  const previousDeps: string[] = [...executionState.dependencies];
  const currentDeps: string[] = [...future.dependencies].map((f) => f.id);

  const additionalDeps = difference(currentDeps, previousDeps);

  for (const additionalDep of additionalDeps) {
    const additionalExecutionState =
      context.deploymentState.executionStates[additionalDep];

    if (additionalExecutionState === undefined) {
      return fail(
        future,
        `A dependency from ${future.id} to ${additionalDep} has been added. The former has started executing before the latter started executing, so this change is incompatible.`,
      );
    }

    // TODO: Check that is was successfully executed before `executionState` was created.
    if (additionalExecutionState.status === ExecutionStatus.SUCCESS) {
      continue;
    }

    return fail(
      future,
      `A dependency from ${future.id} to ${additionalDep} has been added, and both futures had already started executing, so this change is incompatible`,
    );
  }

  return { success: true };
}
