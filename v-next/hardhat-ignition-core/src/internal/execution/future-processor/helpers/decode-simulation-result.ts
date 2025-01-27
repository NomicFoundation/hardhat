import { assertIgnitionInvariant } from "../../../utils/assertions";
import {
  ExecutionResultType,
  SimulationErrorExecutionResult,
  StrategySimulationErrorExecutionResult,
} from "../../types/execution-result";
import {
  CallExecutionState,
  DeploymentExecutionState,
  SendDataExecutionState,
} from "../../types/execution-state";
import {
  CallStrategyGenerator,
  DeploymentStrategyGenerator,
  OnchainInteractionResponseType,
  SIMULATION_SUCCESS_SIGNAL_TYPE,
} from "../../types/execution-strategy";
import { RawStaticCallResult } from "../../types/jsonrpc";

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
