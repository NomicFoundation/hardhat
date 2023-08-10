///////////////////////////////////////////////////////////////////////////////
///                             EXPLANATION                                 ///
///////////////////////////////////////////////////////////////////////////////
///
/// This is meant to be a lower-level equivalent of chain dispatcher.
/// This should be the ONLY module accessing the network, and the only
/// place requiring a provider.
///
/// This module does not use ethers. Why? We want more control over the
/// network, including when each request is performed, and how to handle
/// errors.
///
/// This module is intentionally low-level and should be used by modules
/// that construct on top of it. For that reason, it's stateless.
///////////////////////////////////////////////////////////////////////////////

///////////////////////////////////////////////////////////////////////////////
///                                   TODO                                  ///
///////////////////////////////////////////////////////////////////////////////
///
/// This module is missing the following functions:
/// `getTransactionCount(provider:EIP1193Provider, address:string, blockTag:"pending"|"latest"|number):Promise<number>`
/// `getTransaction(provider:EIP1193Provider, txHash:string):Promise<Transaction|undefined>`
/// `getTransactionReceipt(provider:EIP1193Provider, txHash:string):Promise<TransactionReceipt|undefined>`
/// `getLatestBlock(provider:EIP1193Provider):Promise<Block>`
///
///  And the following type defintions: Transaction, TransactionReceipt, Block
///  These types should only contain the fields that are used by the rest of
///  the system. We don't need to be exhaustive.
///////////////////////////////////////////////////////////////////////////////

import { EIP1193Provider } from "../../types/provider";

/**
 * The params to make an `eth_call`.
 */
export interface CallParams {
  to?: string;
  value: bigint;
  data: string;
  from: string;
  nonce?: number;
}

/**
 * The params to send a transaction.
 */
export interface TransactionParams {
  to?: string;
  value: bigint;
  data: string;
  from: string;
  nonce: number;
  maxPriorityFeePerGas: bigint;
  maxFeePerGas: bigint;
  gasLimit: bigint;
}

/**
 * The params to estimate the gas of a transaction.
 */
export type EstimateGasParams = Omit<TransactionParams, "gasLimit">;

/**
 * The params to pay for the network fees.
 *
 * Note: Currently only EIP-1559 transactions are supported.
 */
export interface NetworkFees {
  maxPriorityFeePerGas: bigint;
  maxFeePerGas: bigint;
}

/**
 * The error returned by `call()`, if any.
 */
export interface CallErrorResult {
  returnData: string;
  isCustomError: boolean;
}

/**
 * Performs an `eth_call` JSON-RPC request, and returns the result or an error
 * object with the return data and a boolean indicating if the request failed
 * with an error message that telling that the call failed with a custom error.
 *
 * @param provider An EIP-1193 provider to perform the call.
 * @param callParams The params for the call.
 * @param blockTag The block tag to use for the call.
 */
export async function call(
  provider: EIP1193Provider,
  callParams: CallParams,
  blockTag: "latest" | "pending"
): Promise<string | CallErrorResult> {
  try {
    const jsonRpcEncodedParams = {
      to: callParams.to,
      value: bigIntToJsonRpcQuantity(callParams.value),
      data: callParams.data,
      from: callParams.from,
      nonce:
        callParams.nonce !== undefined
          ? numberToJsonRpcQuantity(callParams.nonce)
          : null,
    };

    const response = await provider.request({
      method: "eth_call",
      params: [jsonRpcEncodedParams, blockTag],
    });

    if (typeof response !== "string") {
      throw new Error("Invalid response " + response);
    }

    return response;
  } catch (error) {
    if (error instanceof Error) {
      if ("data" in error && typeof error.data === "string") {
        return {
          returnData: error.data,
          isCustomError: isCustomErrorError(error),
        };
      }

      // Geth returns an error object with this code when the call fails
      // without ruturning data.
      if ("code" in error && error.code == -32000) {
        return {
          returnData: "0x",
          isCustomError: false,
        };
      }
    }

    throw error;
  }
}

/**
 * Sends a transaction to the Ethereum network and returns its hash,
 * if the transaction is valid and accepted in the node's mempool.
 *
 * In automined networks eth_sendTransaction may still fail while accepting
 * a transaction in its mempool. In those cases, this function will still
 * return its hash, ignoring any error information.
 *
 * @param provider The EIP-1193 provider to use for sending the transaction.
 * @param transactionParams The parameters of the transaction to send.
 */
export async function sendTransaction(
  provider: EIP1193Provider,
  transactionParams: TransactionParams
): Promise<string> {
  try {
    const jsonRpcEncodedParams = {
      to: transactionParams.to,
      value: bigIntToJsonRpcQuantity(transactionParams.value),
      data: transactionParams.data,
      from: transactionParams.from,
      nonce: numberToJsonRpcQuantity(transactionParams.nonce),
      maxPriorityFeePerGas: bigIntToJsonRpcQuantity(
        transactionParams.maxPriorityFeePerGas
      ),
      maxFeePerGas: bigIntToJsonRpcQuantity(transactionParams.maxFeePerGas),
      gas: bigIntToJsonRpcQuantity(transactionParams.gasLimit),
    };

    const response = await provider.request({
      method: "eth_sendTransaction",
      params: [jsonRpcEncodedParams],
    });

    if (typeof response !== "string") {
      throw new Error("Invalid response " + response);
    }

    return response;
  } catch (error) {
    // If we are in an automined error we may get an error and still
    // the transaction gets mined. In that case we just return its hash.
    if (
      error instanceof Error &&
      "transactionHash" in error &&
      typeof error.transactionHash === "string"
    ) {
      return error.transactionHash;
    }

    throw error;
  }
}

/**
 * Estimates the gas required to execute a transaction.
 *
 * @param provider The EIP-1193 provider to use for the estimate.
 * @param transactionParams The transaction parameters, excluding gasLimit.
 */
export async function estimateGas(
  provider: EIP1193Provider,
  transactionParams: Omit<TransactionParams, "gasLimit">
): Promise<bigint> {
  const jsonRpcEncodedParams = {
    to: transactionParams.to,
    value: bigIntToJsonRpcQuantity(transactionParams.value),
    data: transactionParams.data,
    from: transactionParams.from,
    nonce: numberToJsonRpcQuantity(transactionParams.nonce),
  };

  const response = await provider.request({
    method: "eth_estimateGas",
    params: [jsonRpcEncodedParams],
  });

  if (typeof response !== "string") {
    throw new Error("Invalid response " + response);
  }

  return jsonRpcQuantityToBigInt(response);
}

/**
 * Returns recommended for the network fees.
 * @param provider The EIP-1193 provider to use for the estimate.
 */
export async function getNetworkFees(
  provider: EIP1193Provider
): Promise<NetworkFees> {
  return {
    maxFeePerGas: 1n,
    maxPriorityFeePerGas: 1n,
  };
}

/**
 * A function that returns true if an error thrown by a provider is an
 * execution failure due to a custom error.
 *
 * There are situations where a node may know that an error comes from
 * a custom error, yet we don't have the ABI to decode it. In those cases
 * we want to keep track of the information that the error was a custom error.
 *
 * @param error An error thrown by the provider.
 */
function isCustomErrorError(error: Error): boolean {
  return error.message.includes(" reverted with custom error ");
}

/**
 * Converts a BigInt value to a JSON-RPC quantity string.
 *
 * @param value - The BigInt value to convert.
 * @returns The JSON-RPC quantity string.
 */
function bigIntToJsonRpcQuantity(value: bigint): string {
  if (value === 0n) {
    return "0x0";
  }

  const hex = value.toString(16);
  const trimmedLeadingZeros = hex.replace(/^0+/, "");

  return "0x" + trimmedLeadingZeros;
}

/**
 * Converts a JSON-RPC quantity string to a BigInt value.
 **/
function jsonRpcQuantityToBigInt(value: string): bigint {
  return BigInt(value);
}

/**
 * Converts a number to a JSON-RPC quantity string.
 *
 * @param value The number to convert.
 * @returns The JSON-RPC quantity string.
 */
function numberToJsonRpcQuantity(value: number): string {
  return bigIntToJsonRpcQuantity(BigInt(value));
}
