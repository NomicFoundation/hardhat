import difference from "lodash/difference";

import { Future } from "../../types/module";
import { DeploymentState } from "../execution/types/deployment-state";
import {
  ExecutionState,
  ExecutionStatus,
} from "../execution/types/execution-state";

import { ReconciliationFutureResult } from "./types";
import { fail } from "./utils";

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
