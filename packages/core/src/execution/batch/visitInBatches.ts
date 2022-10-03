import { Deployment } from "deployment/Deployment";
import { Services } from "services/types";
import { ExecutionState } from "types/deployment";
import { ExecutionVertex } from "types/executionGraph";
import {
  VertexVisitResult,
  VertexVisitResultFailure,
  VertexVisitResultSuccess,
  VisitResult,
} from "types/graph";
import { union } from "utils/sets";

import { ExecutionGraph } from "../ExecutionGraph";

import { ExecutionVertexDispatcher, ExecuteBatchResult } from "./types";
import { allDependenciesCompleted } from "./utils";

export async function visitInBatches(
  deployment: Deployment,
  executionGraph: ExecutionGraph,
  executionVertexDispatcher: ExecutionVertexDispatcher
): Promise<VisitResult> {
  deployment.startExecutionPhase(executionGraph);

  while (deployment.hasUnstarted()) {
    const batch = calculateNextBatch(
      deployment.state.execution,
      executionGraph
    );

    deployment.updateExecutionWithNewBatch(batch);

    const executeBatchResult = await executeBatch(
      batch,
      executionGraph,
      deployment.state.execution.resultsAccumulator,
      deployment.updateCurrentBatchWithResult.bind(deployment),
      { services: deployment.services },
      executionVertexDispatcher
    );

    deployment.updateExecutionWithBatchResults(executeBatchResult);

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
  }

  return {
    _kind: "success",
    result: deployment.state.execution.resultsAccumulator,
  };
}

function calculateNextBatch(
  executionState: ExecutionState,
  executionGraph: ExecutionGraph
): Set<number> {
  const potentials = union(executionState.unstarted, executionState.onHold);

  const batch = [...potentials].filter((vertexId) =>
    allDependenciesCompleted(vertexId, executionGraph, executionState.completed)
  );

  return new Set<number>(batch);
}

async function executeBatch(
  batch: Set<number>,
  executionGraph: ExecutionGraph,
  resultsAccumulator: Map<number, VertexVisitResult>,
  uiUpdate: (vertexId: number, result: VertexVisitResult) => void,
  { services }: { services: Services },
  executionVertexDispatcher: ExecutionVertexDispatcher
): Promise<ExecuteBatchResult> {
  const batchVertexes = [...batch]
    .map((vertexId) => executionGraph.vertexes.get(vertexId))
    .filter((v): v is ExecutionVertex => v !== undefined);

  if (batchVertexes.length !== batch.size) {
    throw new Error("Unable to retrieve all vertexes while executing batch");
  }

  const promises = batchVertexes.map(async (vertex) => {
    const result = await executionVertexDispatcher(vertex, resultsAccumulator, {
      services,
    });

    uiUpdate(vertex.id, result);

    return { vertexId: vertex.id, result };
  });

  const results = await Promise.all(promises);

  const successes = results.filter(
    (
      executionResult
    ): executionResult is {
      vertexId: number;
      result: VertexVisitResultSuccess;
    } => executionResult.result._kind === "success"
  );

  const errored = results.filter(
    (
      executionResult
    ): executionResult is {
      vertexId: number;
      result: VertexVisitResultFailure;
    } => executionResult.result._kind === "failure"
  );

  const updatedResultsAccumulator = [...successes, ...errored].reduce(
    (acc, success) => {
      acc.set(success.vertexId, success.result);
      return acc;
    },
    new Map<number, VertexVisitResult>()
  );

  return {
    completed: new Set<number>(successes.map(({ vertexId }) => vertexId)),
    onhold: new Set<number>(),
    errored: new Set<number>(errored.map(({ vertexId }) => vertexId)),
    resultsAccumulator: updatedResultsAccumulator,
  };
}
