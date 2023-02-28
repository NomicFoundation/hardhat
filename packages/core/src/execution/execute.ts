import type { Deployment } from "deployment/Deployment";
import { viewExecutionResults } from "deployment/utils";
import type { Services } from "services/types";
import type { ExecutionOptions, ExecutionState } from "types/deployment";
import type { ExecutionVertexDispatcher } from "types/execution";
import type {
  ExecutionResultsAccumulator,
  ExecutionVertexVisitResult,
  ExecutionVisitResult,
  ExecutionVertex,
} from "types/executionGraph";
import { IgnitionError } from "utils/errors";

import { ExecutionGraph } from "./ExecutionGraph";
import { executionDispatch } from "./dispatch/executionDispatch";
import { allDependenciesCompleted, hashExecutionGraph } from "./utils";

export async function execute(
  deployment: Deployment,
  options: ExecutionOptions
): Promise<ExecutionVisitResult> {
  if (deployment.state.transform.executionGraph === null) {
    throw new IgnitionError("Cannot execute without an execution graph");
  }

  return executeInBatches(
    deployment,
    deployment.state.transform.executionGraph,
    executionDispatch,
    options
  );
}

export async function executeInBatches(
  deployment: Deployment,
  executionGraph: ExecutionGraph,
  executionVertexDispatcher: ExecutionVertexDispatcher,
  options: ExecutionOptions
): Promise<ExecutionVisitResult> {
  const executionGraphHash = hashExecutionGraph(executionGraph);

  await deployment.startExecutionPhase(executionGraphHash, options.force);

  while (deployment.hasUnstarted()) {
    const batch = calculateNextBatch(
      deployment.state.execution,
      executionGraph
    );

    await deployment.updateExecutionWithNewBatch(batch);

    await executeBatch(
      batch,
      executionGraph,
      viewExecutionResults(deployment.state),
      deployment.updateVertexResult.bind(deployment),
      { services: deployment.services },
      executionVertexDispatcher,
      options
    );

    if (deployment.hasErrors()) {
      const errors = deployment.readExecutionErrors();

      return {
        _kind: "failure",
        failures: [
          "execution failed",
          Object.values(errors).map((err) => err.failure),
        ],
      };
    }

    if (deployment.hasHolds()) {
      const holds = deployment.readExecutionHolds();

      return {
        _kind: "hold",
        holds,
      };
    }
  }

  return {
    _kind: "success",
    result: viewExecutionResults(deployment.state),
  };
}

function calculateNextBatch(
  executionState: ExecutionState,
  executionGraph: ExecutionGraph
): number[] {
  const potentials = new Set<number>(
    Object.entries(executionState.vertexes)
      .filter(([_id, v]) => v.status === "UNSTARTED")
      .map(([id]) => parseInt(id, 10))
  );

  const alreadyCompleted = new Set<number>(
    Object.entries(executionState.vertexes)
      .filter(([_id, v]) => v.status === "COMPLETED")
      .map(([id]) => parseInt(id, 10))
  );

  return [...potentials].filter((vertexId) =>
    allDependenciesCompleted(vertexId, executionGraph, alreadyCompleted)
  );
}

async function executeBatch(
  batch: number[],
  executionGraph: ExecutionGraph,
  resultsAccumulator: ExecutionResultsAccumulator,
  deploymentStateUpdate: (
    vertexId: number,
    result: ExecutionVertexVisitResult
  ) => Promise<void>,
  { services }: { services: Services },
  executionVertexDispatcher: ExecutionVertexDispatcher,
  options: ExecutionOptions
): Promise<void> {
  const batchVertexes = [...batch]
    .map((vertexId) => executionGraph.vertexes.get(vertexId))
    .filter((v): v is ExecutionVertex => v !== undefined);

  if (batchVertexes.length !== batch.length) {
    throw new IgnitionError(
      "Unable to retrieve all vertexes while executing batch"
    );
  }

  const promises = batchVertexes.map(async (vertex) => {
    const result = await executionVertexDispatcher(vertex, resultsAccumulator, {
      services,
      options,
    });

    await deploymentStateUpdate(vertex.id, result);

    return { vertexId: vertex.id, result };
  });

  await Promise.all(promises);
}
