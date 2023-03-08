import { ExecutionGraph } from "execution/ExecutionGraph";
import type {
  DeployPhase,
  DeployState,
  ExecutionState,
  DeployStateCommand,
  VertexExecutionState,
} from "types/deployment";

import { deployExecutionStateReducer } from "./deployExecutionStateReducer";
import { assertNeverMessageType } from "./utils";

export function initializeDeployState(moduleName: string): DeployState {
  return {
    phase: "uninitialized",
    details: {
      moduleName,
      chainId: 0,
      networkName: "",
      accounts: [],
    },
    validation: {
      errors: [],
    },
    transform: {
      executionGraph: null,
    },
    execution: {
      run: 0,
      vertexes: {},
      batch: null,
      previousBatches: [],
      executionGraphHash: "",
    },
    unexpected: {
      errors: [],
    },
  };
}

export function deployStateReducer(
  state: DeployState,
  action: DeployStateCommand
): DeployState {
  switch (action.type) {
    case "SET_CHAIN_ID":
      return {
        ...state,
        details: {
          ...state.details,
          chainId: action.chainId,
        },
      };
    case "SET_NETWORK_NAME":
      return {
        ...state,
        details: {
          ...state.details,
          networkName: action.networkName,
        },
      };
    case "SET_ACCOUNTS":
      return {
        ...state,
        details: {
          ...state.details,
          accounts: action.accounts,
        },
      };
    case "START_VALIDATION":
      return {
        ...state,
        phase: "validating",
      };
    case "VALIDATION_FAIL":
      return {
        ...state,
        phase: "validation-failed",
        validation: {
          ...state.validation,
          errors: action.errors,
        },
      };
    case "TRANSFORM_COMPLETE":
      return {
        ...state,
        transform: { executionGraph: action.executionGraph },
      };
    case "RECONCILIATION_FAILED":
      return { ...state, phase: "reconciliation-failed" };
    case "UNEXPECTED_FAIL":
      return {
        ...state,
        phase: "failed-unexpectedly",
        unexpected: {
          errors: action.errors,
        },
      };
    case "EXECUTION::START":
      if (state.transform.executionGraph === null) {
        return state;
      }

      const executionStateForRun = deployExecutionStateReducer(
        initialiseExecutionStateFrom(
          state.transform.executionGraph,
          action.executionGraphHash,
          state.execution,
          action.force
        ),
        action
      );

      return {
        ...state,
        phase: resolvePhaseFrom(executionStateForRun),
        execution: executionStateForRun,
      };
    case "EXECUTION::SET_BATCH":
      return {
        ...state,
        execution: deployExecutionStateReducer(state.execution, action),
      };
    case "EXECUTION::SET_VERTEX_RESULT":
      const updatedExecution = deployExecutionStateReducer(
        state.execution,
        action
      );

      return {
        ...state,
        phase: resolvePhaseFrom(updatedExecution),
        execution: updatedExecution,
      };
    default:
      assertNeverMessageType(action);
      return state;
  }
}

function initialiseExecutionStateFrom(
  executionGraph: ExecutionGraph,
  executionGraphHash: string,
  previousExecutionState: ExecutionState,
  force: boolean
): ExecutionState {
  const vertexes = Array.from(executionGraph.vertexes.keys()).reduce<{
    [key: number]: VertexExecutionState;
  }>((acc, id) => {
    if (!force && previousExecutionState.vertexes[id]?.status === "COMPLETED") {
      return { ...acc, [id]: previousExecutionState.vertexes[id] };
    }

    return { ...acc, [id]: { status: "UNSTARTED", result: null } };
  }, {});

  const executionState: ExecutionState = {
    ...previousExecutionState,
    run: previousExecutionState.run + 1,
    vertexes,
    batch: null,
    previousBatches: [],
    executionGraphHash,
  };

  return executionState;
}

function resolvePhaseFrom(executionState: ExecutionState): DeployPhase {
  if (
    Object.values(executionState.vertexes).some((v) => v.status === "FAILED")
  ) {
    return "failed";
  }

  if (Object.values(executionState.vertexes).some((v) => v.status === "HOLD")) {
    return "hold";
  }

  if (
    Object.values(executionState.vertexes).every(
      (v) => v.status !== "UNSTARTED"
    )
  ) {
    return "complete";
  }

  return "execution";
}
