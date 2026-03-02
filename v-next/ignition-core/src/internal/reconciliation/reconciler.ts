import type {
  ReconciliationCheck,
  ReconciliationContext,
  ReconciliationFailure,
  ReconciliationFutureResult,
  ReconciliationResult,
} from "./types.js";
import type { ArtifactResolver } from "../../types/artifact.js";
import type { DeploymentParameters } from "../../types/deploy.js";
import type { Future, IgnitionModule } from "../../types/module.js";
import type { DeploymentLoader } from "../deployment-loader/types.js";
import type { DeploymentState } from "../execution/types/deployment-state.js";
import type {
  ConcreteExecutionConfig,
  ExecutionState,
} from "../execution/types/execution-state.js";

import { HardhatError } from "@nomicfoundation/hardhat-errors";

import { ExecutionStatus } from "../execution/types/execution-state.js";
import { AdjacencyListConverter } from "../utils/adjacency-list-converter.js";
import { AdjacencyList } from "../utils/adjacency-list.js";
import { getFuturesFromModule } from "../utils/get-futures-from-module.js";

import { reconcileCurrentAndPreviousTypeMatch } from "./reconcile-current-and-previous-type-match.js";
import { reconcileDependencyRules } from "./reconcile-dependency-rules.js";
import { reconcileFutureSpecificReconciliations } from "./reconcile-future-specific-reconciliations.js";

export class Reconciler {
  public static async reconcile(
    module: IgnitionModule,
    deploymentState: DeploymentState,
    deploymentParameters: DeploymentParameters,
    accounts: string[],
    deploymentLoader: DeploymentLoader,
    artifactResolver: ArtifactResolver,
    defaultSender: string,
    strategy: string,
    strategyConfig: ConcreteExecutionConfig,
  ): Promise<ReconciliationResult> {
    const reconciliationFailures = await this._reconcileEachFutureInModule(
      module,
      {
        deploymentState,
        deploymentParameters,
        accounts,
        deploymentLoader,
        artifactResolver,
        defaultSender,
        strategy,
        strategyConfig,
      },
      [
        reconcileCurrentAndPreviousTypeMatch,
        reconcileDependencyRules,
        reconcileFutureSpecificReconciliations,
      ],
    );

    // TODO: Reconcile sender of incomplete futures.

    const missingExecutedFutures = this._missingPreviouslyExecutedFutures(
      module,
      deploymentState,
    );

    return { reconciliationFailures, missingExecutedFutures };
  }

  public static checkForPreviousRunErrors(
    deploymentState: DeploymentState,
  ): ReconciliationFailure[] {
    const failuresOrTimeouts = Object.values(
      deploymentState.executionStates,
    ).filter(
      (exState) =>
        exState.status === ExecutionStatus.FAILED ||
        exState.status === ExecutionStatus.TIMEOUT,
    );

    return failuresOrTimeouts.map((exState) => ({
      futureId: exState.id,
      failure: this._previousRunFailedMessageFor(exState),
    }));
  }

  private static _previousRunFailedMessageFor(exState: ExecutionState): string {
    if (exState.status === ExecutionStatus.FAILED) {
      return `The previous run of the future ${exState.id} failed, and will need wiped before running again`;
    }

    if (exState.status === ExecutionStatus.TIMEOUT) {
      return `The previous run of the future ${exState.id} timed out, and will need wiped before running again`;
    }

    throw new HardhatError(
      HardhatError.ERRORS.IGNITION.RECONCILIATION.INVALID_EXECUTION_STATUS,
      {
        status: exState.status,
      },
    );
  }

  private static async _reconcileEachFutureInModule(
    module: IgnitionModule,
    context: ReconciliationContext,
    checks: ReconciliationCheck[],
  ): Promise<ReconciliationFailure[]> {
    // TODO: swap this out for linearization of execution state
    // once execution is fleshed out.
    const futures = this._getFuturesInReverseTopoligicalOrder(module);

    const failures = [];

    for (const future of futures) {
      const exState = context.deploymentState.executionStates[future.id];
      if (exState === undefined) {
        continue;
      }

      const result = await this._check(future, exState, context, checks);
      if (result.success) {
        continue;
      }

      failures.push(result.failure);
    }

    return failures;
  }

  private static _missingPreviouslyExecutedFutures(
    module: IgnitionModule,
    deploymentState: DeploymentState,
  ) {
    const moduleFutures = new Set(
      getFuturesFromModule(module).map((f) => f.id),
    );

    const previouslyStarted = Object.values(
      deploymentState.executionStates,
    ).map((es) => es.id);

    const missing = previouslyStarted.filter((sf) => !moduleFutures.has(sf));

    return missing;
  }

  private static _getFuturesInReverseTopoligicalOrder(
    module: IgnitionModule,
  ): Future[] {
    const futures = getFuturesFromModule(module);

    const adjacencyList =
      AdjacencyListConverter.buildAdjacencyListFromFutures(futures);

    const sortedFutureIds =
      AdjacencyList.topologicalSort(adjacencyList).reverse();

    return sortedFutureIds
      .map((id) => futures.find((f) => f.id === id))
      .filter((x): x is Future => x !== undefined);
  }

  private static async _check(
    future: Future,
    executionState: ExecutionState,
    context: ReconciliationContext,
    checks: ReconciliationCheck[],
  ): Promise<ReconciliationFutureResult> {
    for (const check of checks) {
      const result = await check(future, executionState, context);

      if (result.success) {
        continue;
      }

      return result;
    }

    return { success: true };
  }
}
