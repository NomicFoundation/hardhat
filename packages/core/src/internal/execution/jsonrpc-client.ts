import { IgnitionError } from "../../errors";
import { ERRORS } from "../../errors-list";
import { EIP1193Provider } from "../../types/provider";

import {
  NetworkFees,
  RawStaticCallResult,
  Transaction,
  TransactionLog,
  TransactionReceipt,
  TransactionReceiptStatus,
} from "./types/jsonrpc";
import { toChecksumFormat } from "./utils/address";

/**
 * The params to make an `eth_call`.
 */
export interface CallParams {
  to?: string;
  value: bigint;
  data: string;
  from: string;
  nonce?: number;
  fees?: NetworkFees;
  gasLimit?: bigint;
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
  fees: NetworkFees;
  gasLimit: bigint;
}

/**
 * The params to estimate the gas of a transaction.
 */
export interface EstimateGasParams
  extends Omit<TransactionParams, "gasLimit" | "fees"> {
  fees?: NetworkFees;
}

/**
 * An Ethereum block.
 */
export interface Block {
  hash: string;
  number: number;
  baseFeePerGas?: bigint;
}

/**
 * This interface has methods for every JSON-RPC call that we need.
 */
export interface JsonRpcClient {
  /**
   * Returns the chain ID of the network.
   */
  getChainId: () => Promise<number>;

  /**
   * Returns the recommended for the network fees.
   */
  getNetworkFees: () => Promise<NetworkFees>;

  /**
   * Returns the latest block.
   */
  getLatestBlock: () => Promise<Block>;

  /**
   * Returns the balance of an account.
   *
   * @param address The account's address.
   * @param blockTag Weather if we should fetch the latest block balance or the pending balance.
   */
  getBalance: (
    address: string,
    blockTag: "latest" | "pending"
  ) => Promise<bigint>;

  /**
   * Performs an `eth_call` JSON-RPC request, and returns the result or an error
   * object with the return data and a boolean indicating if the request failed
   * with an error message that telling that the call failed with a custom error.
   *
   * @param callParams The params for the call.
   * @param blockTag The block tag to use for the call.
   */
  call: (
    callParams: CallParams,
    blockTag: "latest" | "pending"
  ) => Promise<RawStaticCallResult>;

  /**
   * Estimates the gas required to execute a transaction.
   *
   * @param transactionParams The transaction parameters, excluding gasLimit.
   */
  estimateGas: (transactionParams: EstimateGasParams) => Promise<bigint>;

  /**
   * Sends a transaction to the Ethereum network and returns its hash,
   * if the transaction is valid and accepted in the node's mempool.
   *
   * In automined networks eth_sendTransaction may still fail while accepting
   * a transaction in its mempool. In those cases, this function will still
   * return its hash, ignoring any error information.
   *
   * @param transactionParams The parameters of the transaction to send.
   */
  sendTransaction: (transactionParams: TransactionParams) => Promise<string>;

  /**
   * Returns the transaction count of an account.
   *
   * @param address The account's address.
   * @param blockTag The block to use for the count. If "pending", the mempool is taken into account.
   */
  getTransactionCount: (
    address: string,
    blockTag: "pending" | "latest" | number
  ) => Promise<number>;

  /**
   * Returns a transaction, or undefined if it doesn't exist.
   *
   * @param txHash The transaction hash.
   */
  getTransaction: (
    txHash: string
  ) => Promise<Omit<Transaction, "receipt"> | undefined>;

  /**
   * Returns a transaction's receipt, or undefined if the transaction doesn't
   * exist or it hasn't confirmed yet.
   *
   * @param txHash The transaction's hash.
   */
  getTransactionReceipt: (
    txHash: string
  ) => Promise<TransactionReceipt | undefined>;
}

/**
 * A JsonRpcClient that uses an EIP-1193 provider to make the calls.
 */
export class EIP1193JsonRpcClient implements JsonRpcClient {
  constructor(private readonly _provider: EIP1193Provider) {}

  public async getChainId(): Promise<number> {
    const response = await this._provider.request({
      method: "eth_chainId",
      params: [],
    });

    assertResponseType("eth_chainId", response, typeof response === "string");

    return jsonRpcQuantityToNumber(response);
  }

  public async getNetworkFees(): Promise<NetworkFees> {
    const latestBlock = await this.getLatestBlock();

    // We prioritize EIP-1559 fees over legacy gasPrice fees
    if (latestBlock.baseFeePerGas !== undefined) {
      // Logic copied from ethers v6
      const maxPriorityFeePerGas = 1_000_000_000n; // 1gwei
      const maxFeePerGas =
        latestBlock.baseFeePerGas * 2n + maxPriorityFeePerGas;

      return {
        maxFeePerGas,
        maxPriorityFeePerGas,
      };
    }

    const response = await this._provider.request({
      method: "eth_gasPrice",
      params: [],
    });

    assertResponseType("eth_gasPrice", response, typeof response === "string");

    return { gasPrice: jsonRpcQuantityToBigInt(response) };
  }

  public async getLatestBlock(): Promise<Block> {
    const response = await this._provider.request({
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

    let baseFeePerGas: bigint | undefined;
    if ("baseFeePerGas" in response) {
      assertResponseType(
        "eth_getBlockByNumber",
        response,
        typeof response.baseFeePerGas === "string"
      );

      baseFeePerGas = jsonRpcQuantityToBigInt(response.baseFeePerGas);
    }

    return {
      number: jsonRpcQuantityToNumber(response.number),
      hash: response.hash,
      baseFeePerGas,
    };
  }

  public async getBalance(
    address: string,
    blockTag: "latest" | "pending"
  ): Promise<bigint> {
    const balance = await this._provider.request({
      method: "eth_getBalance",
      params: [address, blockTag],
    });

    assertResponseType("eth_getBalance", balance, typeof balance === "string");

    return jsonRpcQuantityToBigInt(balance);
  }

  public async call(
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
        gas:
          callParams.gasLimit !== undefined
            ? bigIntToJsonRpcQuantity(callParams.gasLimit)
            : undefined,
        ...jsonRpcEncodeNetworkFees(callParams.fees),
      };

      const response = await this._provider.request({
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

        // Geth, and potentially other nodes, may return an error without a data
        // field if there was no reason returned
        if (
          error.message.includes("execution reverted") ||
          error.message.includes("invalid opcode")
        ) {
          return {
            success: false,
            returnData: "0x",
            customErrorReported: false,
          };
        }

        // Catch all for other nodes and services
        if (error.message.includes("revert")) {
          return {
            success: false,
            returnData: "0x",
            customErrorReported: false,
          };
        }

        if (error.message.includes("base fee exceeds gas limit")) {
          throw new IgnitionError(ERRORS.EXECUTION.BASE_FEE_EXCEEDS_GAS_LIMIT);
        }
      }

      throw error;
    }
  }

  public async estimateGas(
    estimateGasParams: EstimateGasParams
  ): Promise<bigint> {
    const jsonRpcEncodedParams = {
      to: estimateGasParams.to,
      value: bigIntToJsonRpcQuantity(estimateGasParams.value),
      data: estimateGasParams.data,
      from: estimateGasParams.from,
      nonce: numberToJsonRpcQuantity(estimateGasParams.nonce),
      ...jsonRpcEncodeNetworkFees(estimateGasParams.fees),
    };

    const response = await this._provider.request({
      method: "eth_estimateGas",
      params: [jsonRpcEncodedParams],
    });

    assertResponseType(
      "eth_estimateGas",
      response,
      typeof response === "string"
    );

    return jsonRpcQuantityToBigInt(response);
  }

  public async sendTransaction(
    transactionParams: TransactionParams
  ): Promise<string> {
    try {
      const jsonRpcEncodedParams = {
        to: transactionParams.to,
        value: bigIntToJsonRpcQuantity(transactionParams.value),
        data: transactionParams.data,
        from: transactionParams.from,
        nonce: numberToJsonRpcQuantity(transactionParams.nonce),
        gas: bigIntToJsonRpcQuantity(transactionParams.gasLimit),
        ...jsonRpcEncodeNetworkFees(transactionParams.fees),
      };

      const response = await this._provider.request({
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

  public async getTransactionCount(
    address: string,
    blockTag: number | "latest" | "pending"
  ): Promise<number> {
    const encodedBlockTag =
      typeof blockTag === "number"
        ? numberToJsonRpcQuantity(blockTag)
        : blockTag;

    const response = await this._provider.request({
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

  public async getTransaction(
    txHash: string
  ): Promise<Omit<Transaction, "receipt"> | undefined> {
    const method = "eth_getTransactionByHash";

    const response = await this._provider.request({
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

    assertResponseType(
      method,
      response,
      "blockNumber" in response &&
        (typeof response.blockNumber === "string" ||
          response.blockNumber === null)
    );

    assertResponseType(
      method,
      response,
      "blockHash" in response &&
        (typeof response.blockHash === "string" || response.blockHash === null)
    );

    let networkFees: NetworkFees;
    if ("maxFeePerGas" in response) {
      assertResponseType(
        method,
        response,
        "maxFeePerGas" in response && typeof response.maxFeePerGas === "string"
      );

      assertResponseType(
        method,
        response,
        "maxPriorityFeePerGas" in response &&
          typeof response.maxPriorityFeePerGas === "string"
      );

      networkFees = {
        maxFeePerGas: jsonRpcQuantityToBigInt(response.maxFeePerGas),
        maxPriorityFeePerGas: jsonRpcQuantityToBigInt(
          response.maxPriorityFeePerGas
        ),
      };
    } else {
      assertResponseType(
        method,
        response,
        "gasPrice" in response && typeof response.gasPrice === "string"
      );

      networkFees = {
        gasPrice: jsonRpcQuantityToBigInt(response.gasPrice),
      };
    }

    return {
      hash: response.hash,
      fees: networkFees,
    };
  }

  public async getTransactionReceipt(
    txHash: string
  ): Promise<TransactionReceipt | undefined> {
    const method = "eth_getTransactionReceipt";

    const response = await this._provider.request({
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

    const status =
      jsonRpcQuantityToNumber(response.status) === 1
        ? TransactionReceiptStatus.SUCCESS
        : TransactionReceiptStatus.FAILURE;

    const contractAddress =
      status === TransactionReceiptStatus.SUCCESS
        ? response.contractAddress ?? undefined
        : undefined;

    return {
      blockHash: response.blockHash,
      blockNumber: jsonRpcQuantityToNumber(response.blockNumber),
      contractAddress:
        contractAddress === undefined
          ? undefined
          : toChecksumFormat(contractAddress),
      status,
      logs: formatReceiptLogs(method, response),
    };
  }
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
    throw new IgnitionError(ERRORS.EXECUTION.INVALID_JSON_RPC_RESPONSE, {
      method,
      response: JSON.stringify(response),
    });
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
      address: toChecksumFormat(rawLog.address),
      logIndex: jsonRpcQuantityToNumber(rawLog.logIndex),
      data: rawLog.data,
      topics: rawLog.topics,
    });
  }

  return formattedLogs;
}

function jsonRpcEncodeNetworkFees(fees?: NetworkFees) {
  if (fees === undefined) {
    return undefined;
  }

  if ("gasPrice" in fees) {
    return { gasPrice: bigIntToJsonRpcQuantity(fees.gasPrice) };
  }

  return {
    maxFeePerGas: bigIntToJsonRpcQuantity(fees.maxFeePerGas),
    maxPriorityFeePerGas: bigIntToJsonRpcQuantity(fees.maxPriorityFeePerGas),
  };
}
