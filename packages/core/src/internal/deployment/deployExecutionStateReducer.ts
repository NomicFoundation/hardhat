import type {
  ExecutionState,
  DeployStateExecutionCommand,
  VertexExecutionState,
  VertexExecutionStatusUnstarted,
  VertexExecutionStatusFailed,
  VertexExecutionStatusCompleted,
  VertexExecutionStatusHold,
} from "../types/deployment";
import type { ExecutionVertexVisitResult } from "../types/executionGraph";

import { VertexResultEnum } from "../types/graph";

export function deployExecutionStateReducer(
  state: ExecutionState,
  action: DeployStateExecutionCommand
): ExecutionState {
  switch (action.type) {
    case "EXECUTION::START":
      // initialisation is done at the deployStateReducer level
      return state;
    case "EXECUTION::SET_BATCH":
      return updateExecutionStateWithNewBatch(state, action.batch);
    case "EXECUTION::SET_VERTEX_RESULT":
      const updatedVertexes: { [key: number]: VertexExecutionState } = {
        ...state.vertexes,
        [action.vertexId]: convertTo(action.result),
      };

      if (
        state.batch !== null &&
        [...state.batch].every(
          (id) =>
            updatedVertexes[id]?.status === "COMPLETED" ||
            updatedVertexes[id]?.status === "FAILED" ||
            updatedVertexes[id]?.status === "HOLD"
        )
      ) {
        return {
          ...state,
          batch: null,
          previousBatches: [...state.previousBatches, state.batch],
          vertexes: updatedVertexes,
        };
      }

      return {
        ...state,
        vertexes: updatedVertexes,
      };
  }
}

function updateExecutionStateWithNewBatch(
  state: ExecutionState,
  batch: number[]
): ExecutionState {
  const uniqueBatch = new Set<number>(batch);

  const updatedVertexes = [...uniqueBatch].reduce(
    (vertexes, id): { [key: number]: VertexExecutionState } => ({
      ...vertexes,
      [id]: {
        status: "RUNNING" as VertexExecutionStatusUnstarted,
        result: undefined,
      },
    }),
    state.vertexes
  );

  return {
    ...state,
    batch: uniqueBatch,
    vertexes: updatedVertexes,
  };
}

function convertTo(
  vertexVisitResult: ExecutionVertexVisitResult
): VertexExecutionState {
  switch (vertexVisitResult._kind) {
    case VertexResultEnum.SUCCESS:
      return {
        status: "COMPLETED" as VertexExecutionStatusCompleted,
        result: vertexVisitResult,
      };
    case VertexResultEnum.FAILURE:
      return {
        status: "FAILED" as VertexExecutionStatusFailed,
        result: vertexVisitResult,
      };
    case VertexResultEnum.HOLD:
      return {
        status: "HOLD" as VertexExecutionStatusHold,
        result: undefined,
      };
  }
}
