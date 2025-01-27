import type {
  SimulationErrorExecutionResult,
  StrategySimulationErrorExecutionResult,
} from "../../types/execution-result";
import type {
  CallExecutionState,
  DeploymentExecutionState,
  SendDataExecutionState,
} from "../../types/execution-state";
import type {
  CallStrategyGenerator,
  DeploymentStrategyGenerator,
} from "../../types/execution-strategy";
import type { RawStaticCallResult } from "../../types/jsonrpc";

import { assertIgnitionInvariant } from "../../../utils/assertions";
import { ExecutionResultType } from "../../types/execution-result";
import {
  OnchainInteractionResponseType,
  SIMULATION_SUCCESS_SIGNAL_TYPE,
} from "../../types/execution-strategy";

export function decodeSimulationResult(
  strategyGenerator: DeploymentStrategyGenerator | CallStrategyGenerator,
  exState:
    | DeploymentExecutionState
    | CallExecutionState
    | SendDataExecutionState,
) {
  return async (
    simulationResult: RawStaticCallResult,
  ): Promise<
    | SimulationErrorExecutionResult
    | StrategySimulationErrorExecutionResult
    | undefined
  > => {
    const response = await strategyGenerator.next({
      type: OnchainInteractionResponseType.SIMULATION_RESULT,
      result: simulationResult,
    });

    assertIgnitionInvariant(
      response.value.type === SIMULATION_SUCCESS_SIGNAL_TYPE ||
        response.value.type === ExecutionResultType.STRATEGY_SIMULATION_ERROR ||
        response.value.type === ExecutionResultType.SIMULATION_ERROR,
      `Invalid response received from strategy after a simulation was run before sending a transaction for ExecutionState ${exState.id}`,
    );

    if (response.value.type === SIMULATION_SUCCESS_SIGNAL_TYPE) {
      return undefined;
    }

    return response.value;
  };
}
