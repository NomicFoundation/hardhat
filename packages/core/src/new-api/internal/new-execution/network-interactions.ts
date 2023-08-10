///////////////////////////////////////////////////////////////////////////////
///                             EXPLANATION                                 ///
///////////////////////////////////////////////////////////////////////////////
///
/// This module executes the NetworkInteractions.
///////////////////////////////////////////////////////////////////////////////

import { EIP1193Provider } from "../../types/provider";
import { DeploymentLoader } from "../deployment-loader/types";
import { OnchainInteraction, StaticCall } from "../execution/transaction-types";
import {
  CallExecutionState,
  DeploymentExecutionState,
  SendDataExecutionState,
  StaticCallExecutionState,
} from "../execution/types";
import { decodeError, decodeResult } from "./error-decoding";
import {
  ExecutionError,
  ExecutionResult,
  isExecutionError,
} from "./execution-results";
import { ExecutionStrategy } from "./execution-stratey-adaption";
import {
  NetworkFees,
  call,
  estimateGas,
  getNetworkFees,
  sendTransaction,
} from "./jsonrpc-calls";

/**
 * This function tries to send a transaction to the network as a result of an onchain interaction.
 *
 * This function will run a simulation of the transaction first, and if the simulation
 * fails, it will return an execution error. If the simulation succeeds, it will send
 * the transaction to the network.
 *
 * If anything apart from the simulation fails (e.g. the transaction is not accepted
 * into the mempool, a network connection error, etc.), this function will throw an
 * error.
 *
 * @param provider The provider to use to send the transaction.
 * @param executionState The execution state that's being executed.
 * @param onchainInteraction The onchain interaction whose transaction we want to send.
 * @param executionStrategy The execution strategy that's being used.
 * @param deploymentLoader The deployment loader to use to load the artifact.
 * @returns The transaction hash of the transaction that was sent, or an execution error.
 */
export async function sendTransactionForOnchainInteraction(
  provider: EIP1193Provider,
  executionState:
    | DeploymentExecutionState
    | CallExecutionState
    | SendDataExecutionState,
  onchainInteraction: OnchainInteraction,
  executionStrategy: ExecutionStrategy,
  deploymentLoader: DeploymentLoader
): Promise<string | ExecutionError> {
  const networkFees = await getNetworkFees(provider);

  const simulationResult = await simulateTransaction(
    provider,
    executionState,
    onchainInteraction,
    executionStrategy,
    deploymentLoader,
    networkFees
  );

  if (isExecutionError(simulationResult)) {
    throw new Error(
      "We didn't send the transaction because it will fail with the errror..." +
        simulationResult
    );
  }

  const gasLimit = await estimateGas(provider, {
    to: onchainInteraction.to,
    data: onchainInteraction.data,
    from: onchainInteraction.from,
    value: onchainInteraction.value,
    nonce: onchainInteraction.nonce,
    maxFeePerGas: networkFees.maxFeePerGas,
    maxPriorityFeePerGas: networkFees.maxPriorityFeePerGas,
  });

  const txHash = sendTransaction(provider, {
    to: onchainInteraction.to,
    data: onchainInteraction.data,
    from: onchainInteraction.from,
    value: onchainInteraction.value,
    nonce: onchainInteraction.nonce,
    maxFeePerGas: networkFees.maxFeePerGas,
    maxPriorityFeePerGas: networkFees.maxPriorityFeePerGas,
    gasLimit,
  });

  return txHash;
}

/**
 * This function performs a static call.
 *
 * This function will run an eth_call and decode the result. If the `eth_call`
 * fails with the returnData of its execution, it will decode the error.
 *
 * If anything apart from the execution fails (e.g. a network connection error),
 * this function will throw an error.
 *
 * @param provider The provider to use to send the transaction.
 * @param executionState The execution state that's being executed.
 * @param staticCall The static call to run.
 * @param executionStrategy The execution strategy that's being used.
 * @param deploymentLoader The deployment loader to use to load the artifact.
 * @returns The decoded static call results or an execution error.
 */
export async function staticCallForOnchainInteraction(
  provider: EIP1193Provider,
  executionState: StaticCallExecutionState,
  staticCall: StaticCall,
  executionStrategy: ExecutionStrategy,
  deploymentLoader: DeploymentLoader
): Promise<ExecutionResult | ExecutionError> {
  const result = await call(
    provider,
    {
      to: staticCall.to,
      data: staticCall.data,
      from: staticCall.from,
      value: staticCall.value,
    },
    "latest"
  );

  if (typeof result === "string") {
    // We don't decode the results of deployments
    if (staticCall.to === undefined) {
      return { named: {}, numbered: [] };
    }

    return await decodeResult(result, (returnData) =>
      executionStrategy.decodeNetworkInteractionResult(
        executionState,
        staticCall,
        result,
        (id) => deploymentLoader.loadArtifact(id)
      )
    );
  }

  const { returnData, isCustomError } = result;

  return decodeError(returnData, isCustomError, (returnData) =>
    executionStrategy.decodeCustomError(
      executionState,
      staticCall,
      returnData,
      (id) => deploymentLoader.loadArtifact(id)
    )
  );
}

async function simulateTransaction(
  provider: EIP1193Provider,
  executionState:
    | DeploymentExecutionState
    | CallExecutionState
    | SendDataExecutionState,
  onchainInteraction: OnchainInteraction,
  executionStrategy: ExecutionStrategy,
  deploymentLoader: DeploymentLoader,
  networkFees: NetworkFees
): Promise<ExecutionResult | ExecutionError> {
  const result = await call(
    provider,
    {
      to: onchainInteraction.to,
      data: onchainInteraction.data,
      from: onchainInteraction.from,
      value: onchainInteraction.value,
      nonce: onchainInteraction.nonce,
      // TODO: Should we include the network fees here? We should check what others do
    },
    "pending"
  );

  if (typeof result === "string") {
    // We don't decode the results of deployments
    if (onchainInteraction.to === undefined) {
      return { named: {}, numbered: [] };
    }

    return await decodeResult(result, (returnData) =>
      executionStrategy.decodeNetworkInteractionResult(
        executionState,
        onchainInteraction,
        result,
        (id) => deploymentLoader.loadArtifact(id)
      )
    );
  }

  const { returnData, isCustomError } = result;

  return decodeError(returnData, isCustomError, (returnData) =>
    executionStrategy.decodeCustomError(
      executionState,
      onchainInteraction,
      returnData,
      (id) => deploymentLoader.loadArtifact(id)
    )
  );
}
