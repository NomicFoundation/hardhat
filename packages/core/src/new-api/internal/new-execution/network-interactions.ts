/**
 * This files contains the utility functions that the execution engine should
 * use to interact with the network during the execution of a NetworkInteraction.
 *
 * @file
 */

import { assertIgnitionInvariant } from "../utils/assertions";

import {
  JsonRpcClient,
  NetworkFees,
  TransactionParams,
} from "./jsonrpc-client";
import {
  SimulationErrorExecutionResult,
  StrategyErrorExecutionResult,
} from "./types/execution-result";
import { RawStaticCallResult } from "./types/jsonrpc";
import { OnchainInteraction, StaticCall } from "./types/network-interaction";

/**
 * Runs a StaticCall NetworkInteraction to completion, returning its raw result.
 *
 * @param client The JsonRpcClient to use to interact with the network.
 * @param staticCall The StaticCall to run.
 * @returns The raw result of the StaticCall.
 */
export async function runStaticCall(
  client: JsonRpcClient,
  staticCall: StaticCall
): Promise<RawStaticCallResult> {
  return client.call(
    {
      from: staticCall.from,
      to: staticCall.to,
      data: staticCall.data,
      value: staticCall.value,
    },
    "latest"
  );
}

/**
 * Sends the a transaction to run an OnchainInteraction.
 *
 * If this is the first transaction being sent for the OnchainInteraction, the
 * nonce will be fetched using the provided callback.
 *
 * This function estimates gas and runs a simulation before sending the transaction.
 *
 * Simulations are run both in the case of a failed gas estimation (to report
 * why it failed), and in the case of a successful gas estimation (to make sure
 * the transaction will not fail, and report any error).
 *
 * This function is meant to be used in conjuntion with the ExecutionStrategy's
 * generator that requested the OnchainInteraction, as is its responsibility to
 * decode the result of the simulation. The `decodeSimulationResult` callback is
 * more generic to make this function easier to test, but it should normally
 * call the generator's `next` and return its result, replacing
 * `SimulationSuccessSignal` results with `undefined`.
 *
 * Note that if we are resending a transaction for an OnchainInteraction, we
 * need a new ExecutionStrategy generator to decode the simulation result, as
 * the previous one will be waiting for a confirmed transaction.
 *
 * This function can be used in these cases:
 * - When the OnchainInteraction needs to start being executed (i.e. first tx).
 * - When we detected a dropped transaction and we need to resend it with the
 * same nonce.
 * - When we want to bump the fees of a transaction.
 *
 * This function MUST NOT be used in these cases:
 * - When we detected a dropped transaction and we need to resend it with a
 * different nonce.
 *
 * @param client The JsonRpcClient to use to interact with the network.
 * @param onchainInteraction The OnchainInteraction to send the transaction for.
 * @param getNonce A callback to fetch the nonce for the transaction.
 * @param decodeSimulationResult A callback to decode the result of the simulation.
 *  This callback should return undefined if the simulation was successful, or
 *  a SimulationErrorExecutionResult or StrategyErrorExecutionResult if the
 *  simulation failed.
 * @returns Any error returned by decodeSimulationResult or an object with the
 *  transaction hash and nonce.
 */
export async function sendTransactionForOnchainInteraction(
  client: JsonRpcClient,
  onchainInteraction: OnchainInteraction,
  getNonce: (sender: string) => Promise<number>,
  decodeSimulationResult: (
    simulationResult: RawStaticCallResult
  ) => Promise<
    SimulationErrorExecutionResult | StrategyErrorExecutionResult | undefined
  >
): Promise<
  | SimulationErrorExecutionResult
  | StrategyErrorExecutionResult
  | { txHash: string; nonce: number }
> {
  const nonce =
    onchainInteraction.nonce ?? (await getNonce(onchainInteraction.from));
  const fees = await getNextTransactionFees(client, onchainInteraction);

  const estimateGasPrams: Omit<TransactionParams, "gasLimit"> = {
    to: onchainInteraction.to,
    from: onchainInteraction.from,
    data: onchainInteraction.data,
    value: onchainInteraction.value,
    nonce,
    maxFeePerGas: fees.maxFeePerGas,
    maxPriorityFeePerGas: fees.maxPriorityFeePerGas,
  };

  let gasLimit: bigint;
  try {
    gasLimit = await client.estimateGas(estimateGasPrams);
  } catch (error) {
    // If the gas estimation failed, we simulate the transaction to get information
    // about why it failed.
    //
    // TODO: We are catching every error (e.g. network errors) here, which may be
    // too broad and make the assertion below fail. We could try to catch only
    // estimation errors.
    const failedEstimateGasSimulationResult = await client.call(
      estimateGasPrams,
      "pending"
    );

    const decoded = await decodeSimulationResult(
      failedEstimateGasSimulationResult
    );

    assertIgnitionInvariant(
      decoded !== undefined,
      "Expected failed simulation after having failed to estimate gas"
    );

    return decoded;
  }

  const transactionParams: TransactionParams = {
    ...estimateGasPrams,
    gasLimit,
  };

  // Before sending the transaction, we simulate it to make sure it will not fail.
  // And to get the return data, which we will need to decode the error if the
  // simulation fails.
  const simulationResult = await client.call(transactionParams, "pending");
  const decodedSimulationResult = await decodeSimulationResult(
    simulationResult
  );

  if (decodedSimulationResult !== undefined) {
    return decodedSimulationResult;
  }

  const txHash = await client.sendTransaction(transactionParams);

  return { txHash, nonce };
}

/**
 * Returns the fees to use for the next transaction of an OnchainInteraction.
 * If the OnchainInteraction has existing transactions, it will apply the fee
 * bumping logic.
 *
 * @param client The JsonRpcClient to use to interact with the network.
 * @param onchainInteraction The OnchainInteraction to get the fees for.
 */
async function getNextTransactionFees(
  client: JsonRpcClient,
  onchainInteraction: OnchainInteraction
): Promise<NetworkFees> {
  const recommendedFees = await client.getNetworkFees();

  if (onchainInteraction.transactions.length === 0) {
    return recommendedFees;
  }

  // If we send a follow up transaction for an OnchainInteraction we
  // set it higher fees than the previous transaction, so we can get
  // the last one here.
  const transactionWithHighestFees =
    onchainInteraction.transactions[onchainInteraction.transactions.length - 1];

  const bumpedFees = {
    maxFeePerGas: (transactionWithHighestFees.maxFeePerGas * 110n) / 100n,
    maxPriorityFeePerGas:
      (transactionWithHighestFees.maxPriorityFeePerGas * 110n) / 100n,
  };

  const maxFeePerGas =
    recommendedFees.maxFeePerGas > bumpedFees.maxFeePerGas
      ? recommendedFees.maxFeePerGas
      : bumpedFees.maxFeePerGas;

  const maxPriorityFeePerGas =
    recommendedFees.maxPriorityFeePerGas > bumpedFees.maxPriorityFeePerGas
      ? recommendedFees.maxPriorityFeePerGas
      : bumpedFees.maxPriorityFeePerGas;

  return { maxFeePerGas, maxPriorityFeePerGas };
}
