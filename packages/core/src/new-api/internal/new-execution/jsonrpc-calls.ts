import { IgnitionError } from "../../../errors";
import { EIP1193Provider } from "../../types/provider";
import { assertIgnitionInvariant } from "../utils/assertions";

import {
  RawStaticCallResult,
  Transaction,
  TransactionLog,
  TransactionReceipt,
  TransactionReceiptStatus,
} from "./types/jsonrpc";

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
 * An Ethereum block.
 */
export interface Block {
  hash: string;
  number: number;
  baseFeePerGas: bigint;
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
): Promise<RawStaticCallResult> {
  try {
    const jsonRpcEncodedParams = {
      to: callParams.to,
      value: bigIntToJsonRpcQuantity(callParams.value),
      data: callParams.data,
      from: callParams.from,
      nonce:
        callParams.nonce !== undefined
          ? numberToJsonRpcQuantity(callParams.nonce)
          : undefined,
    };

    const response = await provider.request({
      method: "eth_call",
      params: [jsonRpcEncodedParams, blockTag],
    });

    assertResponseType("eth_call", response, typeof response === "string");

    return {
      success: true,
      returnData: response,
      customErrorReported: false,
    };
  } catch (error) {
    if (error instanceof Error) {
      if ("data" in error && typeof error.data === "string") {
        return {
          success: false,
          returnData: error.data,
          customErrorReported: isCustomErrorError(error),
        };
      }

      // Geth returns an error object with this code when the call fails
      // without ruturning data.
      if ("code" in error && error.code === -32000) {
        return {
          success: false,
          returnData: "0x",
          customErrorReported: false,
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

    assertResponseType(
      "eth_sendTransaction",
      response,
      typeof response === "string"
    );

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

  assertResponseType("eth_estimateGas", response, typeof response === "string");

  return jsonRpcQuantityToBigInt(response);
}

export async function getLatestBlock(
  provider: EIP1193Provider
): Promise<Block> {
  const response = await provider.request({
    method: "eth_getBlockByNumber",
    params: ["latest", false],
  });

  assertResponseType(
    "eth_getBlockByNumber",
    response,
    typeof response === "object" && response !== null
  );

  assertResponseType(
    "eth_getBlockByNumber",
    response,
    "number" in response && typeof response.number === "string"
  );

  assertResponseType(
    "eth_getBlockByNumber",
    response,
    "hash" in response && typeof response.hash === "string"
  );

  assertIgnitionInvariant(
    "baseFeePerGas" in response && typeof response.baseFeePerGas === "string",
    "Ignition only supports networks with EIP-1559 and the latest block doesn't have a baseFeePerGas"
  );

  return {
    number: jsonRpcQuantityToNumber(response.number),
    hash: response.hash,
    baseFeePerGas: jsonRpcQuantityToBigInt(response.baseFeePerGas),
  };
}

export async function getTransactionCount(
  provider: EIP1193Provider,
  address: string,
  blockTag: "pending" | "latest" | number
): Promise<number> {
  const encodedBlockTag =
    typeof blockTag === "number" ? numberToJsonRpcQuantity(blockTag) : blockTag;

  const response = await provider.request({
    method: "eth_getTransactionCount",
    params: [address, encodedBlockTag],
  });

  assertResponseType(
    "eth_getTransactionCount",
    response,
    typeof response === "string"
  );

  return jsonRpcQuantityToNumber(response);
}

export async function getTransaction(
  provider: EIP1193Provider,
  txHash: string
): Promise<Omit<Transaction, "receipt"> | undefined> {
  const method = "eth_getTransactionByHash";

  const response = await provider.request({
    method,
    params: [txHash],
  });

  if (response === null) {
    return undefined;
  }

  assertResponseType(method, response, typeof response === "object");

  assertResponseType(
    method,
    response,
    "hash" in response && typeof response.hash === "string"
  );

  assertIgnitionInvariant(
    "maxFeePerGas" in response && typeof response.maxFeePerGas === "string",
    "Ignition sent a non-EIP-1559 transaction or we got an invalid response"
  );

  assertIgnitionInvariant(
    "maxPriorityFeePerGas" in response &&
      typeof response.maxPriorityFeePerGas === "string",
    "Ignition sent a non-EIP-1559 transaction or we got an invalid response"
  );

  return {
    hash: response.hash,
    maxFeePerGas: jsonRpcQuantityToBigInt(response.maxFeePerGas),
    maxPriorityFeePerGas: jsonRpcQuantityToBigInt(
      response.maxPriorityFeePerGas
    ),
  };
}

export async function getTransactionReceipt(
  provider: EIP1193Provider,
  txHash: string
): Promise<TransactionReceipt | undefined> {
  const method = "eth_getTransactionReceipt";

  const response = await provider.request({
    method,
    params: [txHash],
  });

  if (response === null) {
    return undefined;
  }

  assertResponseType(
    method,
    response,
    typeof response === "object" // de aca le borre un distinto a null al pedo
  );

  assertResponseType(
    method,
    response,
    "blockHash" in response && typeof response.blockHash === "string"
  );

  assertResponseType(
    method,
    response,
    "blockNumber" in response && typeof response.blockNumber === "string"
  );

  assertResponseType(
    method,
    response,
    "status" in response && typeof response.status === "string"
  );

  assertResponseType(
    method,
    response,
    "contractAddress" in response &&
      (response.contractAddress === null ||
        typeof response.contractAddress === "string")
  );

  return {
    blockHash: response.blockHash,
    blockNumber: jsonRpcQuantityToNumber(response.blockNumber),
    contractAddress: response.contractAddress ?? undefined,
    status:
      jsonRpcQuantityToNumber(response.status) ===
      TransactionReceiptStatus.SUCCESS
        ? TransactionReceiptStatus.SUCCESS
        : TransactionReceiptStatus.FAILURE,
    logs: formatReceiptLogs(method, response),
  };
}

/**
 * Returns recommended for the network fees.
 * @param provider The EIP-1193 provider to use for the estimate.
 */
export async function getNetworkFees(
  provider: EIP1193Provider
): Promise<NetworkFees> {
  const latestBlock = await getLatestBlock(provider);
  // Logic copied from ethers v6
  const maxPriorityFeePerGas = 1_000_000_000n; // 1gwei
  const maxFeePerGas = latestBlock.baseFeePerGas * 2n + maxPriorityFeePerGas;

  return {
    maxFeePerGas,
    maxPriorityFeePerGas,
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

  return `0x${trimmedLeadingZeros}`;
}

/**
 * Converts a JSON-RPC quantity string to a BigInt value.
 **/
function jsonRpcQuantityToBigInt(value: string): bigint {
  return BigInt(value);
}

/**
 * Converts a JSON-RPC quantity string to a number.
 */
function jsonRpcQuantityToNumber(value: string): number {
  return Number(BigInt(value));
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

function assertResponseType(
  method: string,
  response: unknown,
  assertion: boolean
): asserts assertion {
  if (!assertion) {
    throw new IgnitionError(
      `Invalid JSON-RPC response for ${method}: ${JSON.stringify(response)}`
    );
  }
}
function formatReceiptLogs(method: string, response: object): TransactionLog[] {
  const formattedLogs: TransactionLog[] = [];

  assertResponseType(
    method,
    response,
    "logs" in response && Array.isArray(response.logs)
  );

  const logs: unknown[] = response.logs;

  for (const rawLog of logs) {
    assertResponseType(
      method,
      response,
      typeof rawLog === "object" && rawLog !== null
    );

    assertResponseType(
      method,
      response,
      "address" in rawLog && typeof rawLog.address === "string"
    );

    assertResponseType(
      method,
      response,
      "logIndex" in rawLog && typeof rawLog.logIndex === "string"
    );

    assertResponseType(
      method,
      response,
      "data" in rawLog && typeof rawLog.data === "string"
    );

    assertResponseType(
      method,
      response,
      "topics" in rawLog && Array.isArray(rawLog.topics)
    );

    assertResponseType(
      method,
      response,
      rawLog.topics.every((t: any) => typeof t === "string")
    );

    formattedLogs.push({
      address: rawLog.address,
      logIndex: jsonRpcQuantityToNumber(rawLog.logIndex),
      data: rawLog.data,
      topics: rawLog.topics,
    });
  }

  return formattedLogs;
}
