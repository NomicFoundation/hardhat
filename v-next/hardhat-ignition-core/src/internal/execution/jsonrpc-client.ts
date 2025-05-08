import type {
  FullTransaction,
  NetworkFees,
  NetworkTransaction,
  RawStaticCallResult,
  Transaction,
  TransactionLog,
  TransactionReceipt,
} from "./types/jsonrpc.js";
import type { EIP1193Provider } from "../../types/provider.js";

import { HardhatError } from "@nomicfoundation/hardhat-errors";

import { TransactionReceiptStatus } from "./types/jsonrpc.js";
import { toChecksumFormat } from "./utils/address.js";

const DEFAULT_MAX_PRIORITY_FEE_PER_GAS = 1_000_000_000n;

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
   * @param blockTag Whether we should fetch the latest block balance or the
   * pending balance.
   */
  getBalance: (
    address: string,
    blockTag: "latest" | "pending",
  ) => Promise<bigint>;

  /**
   * Update the balance of the account. Only relevant for local development
   * chains.
   *
   * @param address The account's address.
   * @param balance The balance to set the account to.
   * @returns Whether the update was applied.
   */
  setBalance: (address: string, balance: bigint) => Promise<boolean>;

  /**
   * Performs an `eth_call` JSON-RPC request, and returns the result or an error
   * object with the return data and a boolean indicating if the request failed
   * with an error message that telling that the call failed with a custom
   * error.
   *
   * @param callParams The params for the call.
   * @param blockTag The block tag to use for the call.
   */
  call: (
    callParams: CallParams,
    blockTag: "latest" | "pending",
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
   * Sends a presigned raw transaction to the Ethereum network and returns
   * its hash, if the transaction is valid and accepted in the node's mempool.
   *
   * @param presignedTx the presigned transaction to send
   * @returns the hash of the transaction.
   */
  sendRawTransaction: (presignedTx: string) => Promise<string>;

  /**
   * Returns the transaction count of an account.
   *
   * @param address The account's address.
   * @param blockTag The block to use for the count. If "pending", the mempool
   * is taken into account.
   */
  getTransactionCount: (
    address: string,
    blockTag: "pending" | "latest" | number,
  ) => Promise<number>;

  /**
   * Returns a transaction, or undefined if it doesn't exist.
   *
   * @param txHash The transaction hash.
   */
  getTransaction: (
    txHash: string,
  ) => Promise<Omit<Transaction, "receipt"> | undefined>;

  /**
   * Returns a transaction's receipt, or undefined if the transaction doesn't
   * exist or it hasn't confirmed yet.
   *
   * @param txHash The transaction's hash.
   */
  getTransactionReceipt: (
    txHash: string,
  ) => Promise<TransactionReceipt | undefined>;

  /**
   * Returns the deployed bytecode of the contract at the given address.
   *
   * If the address is not a contract or it does not have bytecode the returned
   * result will be "0x".
   *
   * @param address the address of the contract
   * @returns the deployed bytecode of the contract
   */
  getCode: (address: string) => Promise<string>;
}

/**
 * A JsonRpcClient that uses an EIP-1193 provider to make the calls.
 */
export class EIP1193JsonRpcClient implements JsonRpcClient {
  constructor(
    private readonly _provider: EIP1193Provider,
    private readonly _config?: {
      maxFeePerGasLimit?: bigint;
      maxPriorityFeePerGas?: bigint;
      gasPrice?: bigint;
    },
  ) {}

  public async getChainId(): Promise<number> {
    const response = await this._provider.request({
      method: "eth_chainId",
      params: [],
    });

    assertResponseType("eth_chainId", response, typeof response === "string");

    return jsonRpcQuantityToNumber(response);
  }

  public async getNetworkFees(): Promise<NetworkFees> {
    const fees = await this._getNetworkFees();
    const maxFees = "gasPrice" in fees ? fees.gasPrice : fees.maxFeePerGas;

    if (
      this._config?.maxFeePerGasLimit !== undefined &&
      maxFees > this._config.maxFeePerGasLimit
    ) {
      throw new HardhatError(
        HardhatError.ERRORS.IGNITION.EXECUTION.MAX_FEE_PER_GAS_EXCEEDS_GAS_LIMIT,
      );
    }

    return fees;
  }

  public async getLatestBlock(): Promise<Block> {
    const response = await this._provider.request({
      method: "eth_getBlockByNumber",
      params: ["latest", false],
    });

    assertResponseType(
      "eth_getBlockByNumber",
      response,
      typeof response === "object" && response !== null,
    );

    assertResponseType(
      "eth_getBlockByNumber",
      response,
      "number" in response && typeof response.number === "string",
    );

    assertResponseType(
      "eth_getBlockByNumber",
      response,
      "hash" in response && typeof response.hash === "string",
    );

    let baseFeePerGas: bigint | undefined;
    if ("baseFeePerGas" in response) {
      assertResponseType(
        "eth_getBlockByNumber",
        response,
        typeof response.baseFeePerGas === "string",
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
    blockTag: "latest" | "pending",
  ): Promise<bigint> {
    const balance = await this._provider.request({
      method: "eth_getBalance",
      params: [address, blockTag],
    });

    assertResponseType("eth_getBalance", balance, typeof balance === "string");

    return jsonRpcQuantityToBigInt(balance);
  }

  public async setBalance(address: string, balance: bigint): Promise<boolean> {
    const balanceHex = bigIntToJsonRpcQuantity(balance);

    const returnedBalance = await this._provider.request({
      method: "hardhat_setBalance",
      params: [address, balanceHex],
    });

    // anvil supports this method, but returns `null` instead of a boolean
    if (returnedBalance === null) {
      return true;
    }

    assertResponseType(
      "hardhat_setBalance",
      returnedBalance,
      typeof returnedBalance === "boolean",
    );

    return returnedBalance;
  }

  public async call(
    callParams: CallParams,
    blockTag: "latest" | "pending",
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
        const errorWithData = error as { data?: string | { data?: string } };
        const data =
          typeof errorWithData.data === "string"
            ? errorWithData.data
            : errorWithData.data?.data;

        if (data !== undefined) {
          return {
            success: false,
            returnData: data,
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
          throw new HardhatError(
            HardhatError.ERRORS.IGNITION.EXECUTION.BASE_FEE_EXCEEDS_GAS_LIMIT,
          );
        }
      }

      throw error;
    }
  }

  public async estimateGas(
    estimateGasParams: EstimateGasParams,
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
      typeof response === "string",
    );

    return jsonRpcQuantityToBigInt(response);
  }

  public async sendTransaction(
    transactionParams: TransactionParams,
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
        typeof response === "string",
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

  public async sendRawTransaction(presignedTx: string): Promise<string> {
    const response = await this._provider.request({
      method: "eth_sendRawTransaction",
      params: [presignedTx],
    });

    assertResponseType(
      "eth_sendRawTransaction",
      response,
      typeof response === "string",
    );

    return response;
  }

  public async getTransactionCount(
    address: string,
    blockTag: number | "latest" | "pending",
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
      typeof response === "string",
    );

    return jsonRpcQuantityToNumber(response);
  }

  /**
   * Like `getTransaction`, but returns the full transaction object.
   */
  public async getFullTransaction(
    txHash: string,
  ): Promise<FullTransaction | undefined> {
    const method = "eth_getTransactionByHash";

    const response = await this._provider.request({
      method,
      params: [txHash],
    });

    if (response === null) {
      return undefined;
    }

    assertResponseIsNetworkTransactionType(response);

    return {
      hash: response.hash,
      data: response.input,
      from: response.from,
      to: response.to ?? undefined,
      chainId: jsonRpcQuantityToNumber(response.chainId),
      value: jsonRpcQuantityToBigInt(response.value),
      nonce: jsonRpcQuantityToNumber(response.nonce),
      blockHash: response.blockHash,
      blockNumber:
        response.blockNumber !== null
          ? jsonRpcQuantityToBigInt(response.blockNumber)
          : null,
      maxFeePerGas:
        "maxFeePerGas" in response
          ? jsonRpcQuantityToBigInt(response.maxFeePerGas)
          : undefined,
      maxPriorityFeePerGas:
        "maxPriorityFeePerGas" in response
          ? jsonRpcQuantityToBigInt(response.maxPriorityFeePerGas)
          : undefined,
      gasPrice:
        "gasPrice" in response
          ? jsonRpcQuantityToBigInt(response.gasPrice)
          : undefined,
      gasLimit:
        "gas" in response && response.gas !== undefined
          ? jsonRpcQuantityToBigInt(response.gas)
          : undefined,
    };
  }

  public async getTransaction(
    txHash: string,
  ): Promise<Omit<Transaction, "receipt"> | undefined> {
    const method = "eth_getTransactionByHash";

    const response = await this._provider.request({
      method,
      params: [txHash],
    });

    if (response === null) {
      return undefined;
    }

    assertResponseIsNetworkTransactionType(response);

    let networkFees: NetworkFees;
    if ("maxFeePerGas" in response) {
      networkFees = {
        maxFeePerGas: jsonRpcQuantityToBigInt(response.maxFeePerGas),
        maxPriorityFeePerGas: jsonRpcQuantityToBigInt(
          response.maxPriorityFeePerGas,
        ),
      };
    } else {
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
    txHash: string,
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
      "blockHash" in response && typeof response.blockHash === "string",
    );

    assertResponseType(
      method,
      response,
      "blockNumber" in response && typeof response.blockNumber === "string",
    );

    assertResponseType(
      method,
      response,
      "status" in response && typeof response.status === "string",
    );

    assertResponseType(
      method,
      response,
      "contractAddress" in response &&
        (response.contractAddress === null ||
          typeof response.contractAddress === "string"),
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

  public async getCode(address: string): Promise<string> {
    const result = await this._provider.request({
      method: "eth_getCode",
      params: [address, "latest"],
    });

    assertResponseType("eth_getCode", result, typeof result === "string");

    return result;
  }

  private async _getNetworkFees(): Promise<NetworkFees> {
    const [latestBlock, chainId] = await Promise.all([
      this.getLatestBlock(),
      this.getChainId(),
    ]);

    // We prioritize EIP-1559 fees over legacy gasPrice fees, however,
    // polygon (chainId 137) and polygon's amoy testnet (chainId 80002)
    // both require legacy gasPrice fees so we skip EIP-1559 logic in those cases
    if (
      latestBlock.baseFeePerGas !== undefined &&
      chainId !== 137 &&
      chainId !== 80002
    ) {
      // Support zero gas fee chains, such as a private instances
      // of blockchains using Besu. We explicitly exclude BNB
      // Smartchain (chainId 56) and its testnet (chainId 97)
      // as well as opBNB (chainId 204) and its testnet (chainId 5611)
      // from this logic as it is EIP-1559 compliant but
      // only sets a maxPriorityFeePerGas.
      if (
        latestBlock.baseFeePerGas === 0n &&
        chainId !== 56 &&
        chainId !== 97 &&
        chainId !== 204 &&
        chainId !== 5611
      ) {
        return {
          maxFeePerGas: 0n,
          maxPriorityFeePerGas: 0n,
        };
      }

      const maxPriorityFeePerGas = await this._resolveMaxPriorityFeePerGas();

      // Logic copied from ethers v6
      const maxFeePerGas =
        latestBlock.baseFeePerGas * 2n + maxPriorityFeePerGas;

      return {
        maxFeePerGas,
        maxPriorityFeePerGas,
      };
    }

    /**
     * Polygon amoy testnet (chainId 80002) currently has a bug causing the
     * `eth_gasPrice` RPC call to return an amount that is way too high.
     * We hardcode the gas price for this chain for now until the bug is fixed.
     * See: https://github.com/maticnetwork/bor/issues/1213
     *
     * Note that at the time of this implementation, the issue was autoclosed by a bot
     * as a maintainer had not responded to the issue yet. Users continue to report
     * the bug in the issue comments, however.
     *
     * All of that to say, when evaluating whether this logic is still needed in the future,
     * it will likely be required to read through the issue above, rather than relying on the
     * status of the github issue itself.
     */
    if (chainId === 80002) {
      return { gasPrice: 32000000000n };
    }

    if (this._config?.gasPrice !== undefined) {
      return { gasPrice: this._config.gasPrice };
    }

    const response = await this._provider.request({
      method: "eth_gasPrice",
      params: [],
    });

    assertResponseType("eth_gasPrice", response, typeof response === "string");

    return { gasPrice: jsonRpcQuantityToBigInt(response) };
  }

  /**
   * The max fee per gas is needed in the max fee calculation.
   *
   * It is resolved from config if present, falling back to
   * the  `eth_maxPriorityFeePerGas` RPC call if supported by the chain,
   * and finally falling back to the default max fee per gas.
   *
   * @returns a max fee per gas based on the config, RPC call, or default value.
   */
  private async _resolveMaxPriorityFeePerGas(): Promise<bigint> {
    if (this._config?.maxPriorityFeePerGas !== undefined) {
      return this._config?.maxPriorityFeePerGas;
    }

    try {
      return await this._getMaxPriorityFeePerGas();
    } catch {
      // the max priority fee RPC call is not supported by
      // this chain
    }

    return DEFAULT_MAX_PRIORITY_FEE_PER_GAS;
  }

  private async _getMaxPriorityFeePerGas(): Promise<bigint> {
    const fee = await this._provider.request({
      method: "eth_maxPriorityFeePerGas",
    });

    assertResponseType(
      "eth_maxPriorityFeePerGas",
      fee,
      typeof fee === "string",
    );

    return jsonRpcQuantityToBigInt(fee);
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
  assertion: boolean,
): asserts assertion {
  if (!assertion) {
    throw new HardhatError(
      HardhatError.ERRORS.IGNITION.EXECUTION.INVALID_JSON_RPC_RESPONSE,
      {
        method,
        response: JSON.stringify(response),
      },
    );
  }
}

function assertResponseIsNetworkTransactionType(
  response: unknown,
): asserts response is NetworkTransaction {
  const method = "eth_getTransactionByHash";

  assertResponseType(
    method,
    response,
    typeof response === "object" && response !== null,
  );

  assertResponseType(
    method,
    response,
    "hash" in response && typeof response.hash === "string",
  );

  assertResponseType(
    method,
    response,
    "blockNumber" in response &&
      (typeof response.blockNumber === "string" ||
        response.blockNumber === null),
  );

  assertResponseType(
    method,
    response,
    "blockHash" in response &&
      (typeof response.blockHash === "string" || response.blockHash === null),
  );

  assertResponseType(
    method,
    response,
    "input" in response && typeof response.input === "string",
  );

  assertResponseType(
    method,
    response,
    "nonce" in response && typeof response.input === "string",
  );

  if ("maxFeePerGas" in response) {
    assertResponseType(
      method,
      response,
      "maxFeePerGas" in response && typeof response.maxFeePerGas === "string",
    );

    assertResponseType(
      method,
      response,
      "maxPriorityFeePerGas" in response &&
        typeof response.maxPriorityFeePerGas === "string",
    );
  } else {
    assertResponseType(
      method,
      response,
      "gasPrice" in response && typeof response.gasPrice === "string",
    );
  }
}

function formatReceiptLogs(method: string, response: object): TransactionLog[] {
  const formattedLogs: TransactionLog[] = [];

  assertResponseType(
    method,
    response,
    "logs" in response && Array.isArray(response.logs),
  );

  const logs: unknown[] = response.logs;

  for (const rawLog of logs) {
    assertResponseType(
      method,
      response,
      typeof rawLog === "object" && rawLog !== null,
    );

    assertResponseType(
      method,
      response,
      "address" in rawLog && typeof rawLog.address === "string",
    );

    assertResponseType(
      method,
      response,
      "logIndex" in rawLog && typeof rawLog.logIndex === "string",
    );

    assertResponseType(
      method,
      response,
      "data" in rawLog && typeof rawLog.data === "string",
    );

    assertResponseType(
      method,
      response,
      "topics" in rawLog && Array.isArray(rawLog.topics),
    );

    assertResponseType(
      method,
      response,
      rawLog.topics.every((t: any) => typeof t === "string"),
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
