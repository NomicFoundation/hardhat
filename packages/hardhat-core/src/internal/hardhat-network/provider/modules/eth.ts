import { Block } from "@nomicfoundation/ethereumjs-block";
import { Common } from "@nomicfoundation/ethereumjs-common";
import {
  Transaction,
  TransactionFactory,
  TypedTransaction,
} from "@nomicfoundation/ethereumjs-tx";
import {
  Address,
  bufferToHex,
  toBuffer,
  toRpcSig,
  zeroAddress,
} from "@nomicfoundation/ethereumjs-util";
import * as t from "io-ts";
import cloneDeep from "lodash/cloneDeep";

import { BoundExperimentalHardhatNetworkMessageTraceHook } from "../../../../types";
import { RpcAccessList } from "../../../core/jsonrpc/types/access-list";
import {
  bufferToRpcData,
  numberToRpcQuantity,
  rpcAddress,
  rpcData,
  rpcFloat,
  rpcHash,
  rpcQuantity,
  rpcStorageSlot,
} from "../../../core/jsonrpc/types/base-types";
import {
  optionalRpcNewBlockTag,
  OptionalRpcNewBlockTag,
  OptionalRpcOldBlockTag,
  rpcNewBlockTag,
  RpcNewBlockTag,
  rpcOldBlockTag,
  RpcOldBlockTag,
} from "../../../core/jsonrpc/types/input/blockTag";
import {
  rpcCallRequest,
  RpcCallRequest,
} from "../../../core/jsonrpc/types/input/callRequest";
import {
  optionalRpcFilterRequest,
  OptionalRpcFilterRequest,
  rpcFilterRequest,
  RpcFilterRequest,
} from "../../../core/jsonrpc/types/input/filterRequest";
import { OptionalRpcLogAddress } from "../../../core/jsonrpc/types/input/logAddress";
import { OptionalRpcLogTopics } from "../../../core/jsonrpc/types/input/logTopics";
import {
  rpcSubscribeRequest,
  RpcSubscribeRequest,
} from "../../../core/jsonrpc/types/input/subscribeRequest";
import {
  rpcTransactionRequest,
  RpcTransactionRequest,
} from "../../../core/jsonrpc/types/input/transactionRequest";
import { validateParams } from "../../../core/jsonrpc/types/input/validation";
import {
  InvalidArgumentsError,
  InvalidInputError,
  MethodNotFoundError,
  MethodNotSupportedError,
} from "../../../core/providers/errors";
import { MessageTrace } from "../../stack-traces/message-trace";
import { LATEST_BLOCK } from "../filter";
import { HardhatNode } from "../node";
import {
  CallParams,
  FilterParams,
  GatherTracesResult,
  MineBlockResult,
  TransactionParams,
} from "../node-types";
import {
  getRpcBlock,
  getRpcTransaction,
  RpcBlockOutput,
  RpcLogOutput,
  RpcReceiptOutput,
  RpcTransactionOutput,
  shouldShowTransactionTypeForHardfork,
} from "../output";

import { assertHardhatNetworkInvariant } from "../utils/assertions";
import { optional } from "../../../util/io-ts";
import * as BigIntUtils from "../../../util/bigint";
import { ModulesLogger } from "./logger";

const EIP1559_MIN_HARDFORK = "london";
const ACCESS_LIST_MIN_HARDFORK = "berlin";
const EIP155_MIN_HARDFORK = "spuriousDragon";

/* eslint-disable @nomiclabs/hardhat-internal-rules/only-hardhat-error */
export class EthModule {
  constructor(
    private readonly _common: Common,
    private readonly _node: HardhatNode,
    private readonly _throwOnTransactionFailures: boolean,
    private readonly _throwOnCallFailures: boolean,
    private readonly _logger: ModulesLogger,
    private readonly _experimentalHardhatNetworkMessageTraceHooks: BoundExperimentalHardhatNetworkMessageTraceHook[] = []
  ) {}

  public async processRequest(
    method: string,
    params: any[] = []
  ): Promise<any> {
    switch (method) {
      case "eth_accounts":
        return this._accountsAction(...this._accountsParams(params));

      case "eth_blockNumber":
        return this._blockNumberAction(...this._blockNumberParams(params));

      case "eth_call":
        return this._callAction(...this._callParams(params));

      case "eth_chainId":
        return this._chainIdAction(...this._chainIdParams(params));

      case "eth_coinbase":
        return this._coinbaseAction(...this._coinbaseParams(params));

      case "eth_compileLLL":
        throw new MethodNotSupportedError(method);

      case "eth_compileSerpent":
        throw new MethodNotSupportedError(method);

      case "eth_compileSolidity":
        throw new MethodNotSupportedError(method);

      case "eth_estimateGas":
        return this._estimateGasAction(...this._estimateGasParams(params));

      case "eth_gasPrice":
        return this._gasPriceAction(...this._gasPriceParams(params));

      case "eth_getBalance":
        return this._getBalanceAction(...this._getBalanceParams(params));

      case "eth_getBlockByHash":
        return this._getBlockByHashAction(
          ...this._getBlockByHashParams(params)
        );

      case "eth_getBlockByNumber":
        return this._getBlockByNumberAction(
          ...this._getBlockByNumberParams(params)
        );

      case "eth_getBlockTransactionCountByHash":
        return this._getBlockTransactionCountByHashAction(
          ...this._getBlockTransactionCountByHashParams(params)
        );

      case "eth_getBlockTransactionCountByNumber":
        return this._getBlockTransactionCountByNumberAction(
          ...this._getBlockTransactionCountByNumberParams(params)
        );

      case "eth_getCode":
        return this._getCodeAction(...this._getCodeParams(params));

      case "eth_getCompilers":
        throw new MethodNotSupportedError(method);

      case "eth_getFilterChanges":
        return this._getFilterChangesAction(
          ...this._getFilterChangesParams(params)
        );

      case "eth_getFilterLogs":
        return this._getFilterLogsAction(...this._getFilterLogsParams(params));

      case "eth_getLogs":
        return this._getLogsAction(...this._getLogsParams(params));

      case "eth_getProof":
        throw new MethodNotSupportedError(method);

      case "eth_getStorageAt":
        return this._getStorageAtAction(...this._getStorageAtParams(params));

      case "eth_getTransactionByBlockHashAndIndex":
        return this._getTransactionByBlockHashAndIndexAction(
          ...this._getTransactionByBlockHashAndIndexParams(params)
        );

      case "eth_getTransactionByBlockNumberAndIndex":
        return this._getTransactionByBlockNumberAndIndexAction(
          ...this._getTransactionByBlockNumberAndIndexParams(params)
        );

      case "eth_getTransactionByHash":
        return this._getTransactionByHashAction(
          ...this._getTransactionByHashParams(params)
        );

      case "eth_getTransactionCount":
        return this._getTransactionCountAction(
          ...this._getTransactionCountParams(params)
        );

      case "eth_getTransactionReceipt":
        return this._getTransactionReceiptAction(
          ...this._getTransactionReceiptParams(params)
        );

      case "eth_getUncleByBlockHashAndIndex":
        throw new MethodNotSupportedError(method);

      case "eth_getUncleByBlockNumberAndIndex":
        throw new MethodNotSupportedError(method);

      case "eth_getUncleCountByBlockHash":
        throw new MethodNotSupportedError(method);

      case "eth_getUncleCountByBlockNumber":
        throw new MethodNotSupportedError(method);

      case "eth_getWork":
        throw new MethodNotSupportedError(method);

      case "eth_hashrate":
        throw new MethodNotSupportedError(method);

      case "eth_mining":
        return this._miningAction(...this._miningParams(params));

      case "eth_newBlockFilter":
        return this._newBlockFilterAction(
          ...this._newBlockFilterParams(params)
        );

      case "eth_newFilter":
        return this._newFilterAction(...this._newFilterParams(params));

      case "eth_newPendingTransactionFilter":
        return this._newPendingTransactionAction(
          ...this._newPendingTransactionParams(params)
        );

      case "eth_pendingTransactions":
        return this._pendingTransactionsAction(
          ...this._pendingTransactionsParams(params)
        );

      case "eth_protocolVersion":
        throw new MethodNotSupportedError(method);

      case "eth_sendRawTransaction":
        return this._sendRawTransactionAction(
          ...this._sendRawTransactionParams(params)
        );

      case "eth_sendTransaction":
        return this._sendTransactionAction(
          ...this._sendTransactionParams(params)
        );

      case "eth_sign":
        return this._signAction(...this._signParams(params));

      case "eth_signTransaction":
        throw new MethodNotSupportedError(method);

      case "eth_signTypedData":
        throw new MethodNotSupportedError(method);

      case "eth_signTypedData_v3":
        throw new MethodNotSupportedError(method);

      // TODO: we're currently mimicking the MetaMask implementation here.
      // The EIP 712 is still a draft. It doesn't actually distinguish different versions
      // of the eth_signTypedData API.
      // Also, note that go-ethereum implemented this in a clef JSON-RPC API: account_signTypedData.
      case "eth_signTypedData_v4":
        return this._signTypedDataV4Action(
          ...this._signTypedDataV4Params(params)
        );

      case "eth_submitHashrate":
        throw new MethodNotSupportedError(method);

      case "eth_submitWork":
        throw new MethodNotSupportedError(method);

      case "eth_subscribe":
        return this._subscribeAction(...this._subscribeParams(params));

      case "eth_syncing":
        return this._syncingAction(...this._syncingParams(params));

      case "eth_uninstallFilter":
        return this._uninstallFilterAction(
          ...this._uninstallFilterParams(params)
        );

      case "eth_unsubscribe":
        return this._unsubscribeAction(...this._unsubscribeParams(params));

      case "eth_feeHistory":
        return this._feeHistoryAction(...this._feeHistoryParams(params));
    }

    throw new MethodNotFoundError(`Method ${method} not found`);
  }

  // eth_accounts

  private _accountsParams(params: any[]): [] {
    return validateParams(params);
  }

  private async _accountsAction(): Promise<string[]> {
    return this._node.getLocalAccountAddresses();
  }

  // eth_blockNumber

  private _blockNumberParams(params: any[]): [] {
    return validateParams(params);
  }

  private async _blockNumberAction(): Promise<string> {
    const blockNumber = this._node.getLatestBlockNumber();
    return numberToRpcQuantity(blockNumber);
  }

  // eth_call

  private _callParams(params: any[]): [RpcCallRequest, OptionalRpcNewBlockTag] {
    return validateParams(params, rpcCallRequest, optionalRpcNewBlockTag);
  }

  private async _callAction(
    rpcCall: RpcCallRequest,
    blockTag: OptionalRpcNewBlockTag
  ): Promise<string> {
    this._validateTransactionAndCallRequest(rpcCall);

    const blockNumberOrPending = await this._resolveNewBlockTag(blockTag);

    const callParams = await this._rpcCallRequestToNodeCallParams(rpcCall);

    const {
      result: returnData,
      trace,
      error,
      consoleLogMessages,
    } = await this._node.runCall(callParams, blockNumberOrPending);

    const code = await this._node.getCodeFromTrace(trace, blockNumberOrPending);

    this._logger.logCallTrace(
      callParams,
      code,
      trace,
      consoleLogMessages,
      error
    );

    await this._runHardhatNetworkMessageTraceHooks(trace, true);

    if (error !== undefined && this._throwOnCallFailures) {
      const callReturnData = trace?.returnData.toString("hex") ?? "";
      (error as any).data = `0x${callReturnData}`;

      throw error;
    }

    return bufferToRpcData(returnData.value);
  }

  // eth_chainId

  private _chainIdParams(params: any[]): [] {
    return validateParams(params);
  }

  private async _chainIdAction(): Promise<string> {
    return numberToRpcQuantity(this._common.chainId());
  }

  // eth_coinbase

  private _coinbaseParams(params: any[]): [] {
    return validateParams(params);
  }

  private async _coinbaseAction(): Promise<string> {
    return this._node.getCoinbaseAddress().toString();
  }

  // eth_compileLLL

  // eth_compileSerpent

  // eth_compileSolidity

  // eth_estimateGas

  private _estimateGasParams(
    params: any[]
  ): [RpcCallRequest, OptionalRpcNewBlockTag] {
    // Estimate gas uses a CallArgs in Geth, so we mimic it here
    return validateParams(params, rpcCallRequest, optionalRpcNewBlockTag);
  }

  private async _estimateGasAction(
    callRequest: RpcCallRequest,
    blockTag: OptionalRpcNewBlockTag
  ): Promise<string> {
    this._validateTransactionAndCallRequest(callRequest);

    // estimateGas behaves differently when there's no blockTag
    // it uses "pending" as default instead of "latest"
    const blockNumberOrPending = await this._resolveNewBlockTag(
      blockTag,
      "pending"
    );

    const callParams = await this._rpcCallRequestToNodeCallParams(callRequest);

    const { estimation, error, trace, consoleLogMessages } =
      await this._node.estimateGas(callParams, blockNumberOrPending);

    if (error !== undefined) {
      const code = await this._node.getCodeFromTrace(
        trace,
        blockNumberOrPending
      );

      this._logger.logEstimateGasTrace(
        callParams,
        code,
        trace,
        consoleLogMessages,
        error
      );

      const callReturnData = trace?.returnData.toString("hex") ?? "";
      (error as any).data = `0x${callReturnData}`;

      throw error;
    }

    return numberToRpcQuantity(estimation);
  }

  // eth_gasPrice

  private _gasPriceParams(params: any[]): [] {
    return validateParams(params);
  }

  private async _gasPriceAction(): Promise<string> {
    return numberToRpcQuantity(await this._node.getGasPrice());
  }

  // eth_getBalance

  private _getBalanceParams(params: any[]): [Buffer, OptionalRpcNewBlockTag] {
    return validateParams(params, rpcAddress, optionalRpcNewBlockTag);
  }

  private async _getBalanceAction(
    address: Buffer,
    blockTag: OptionalRpcNewBlockTag
  ): Promise<string> {
    const blockNumberOrPending = await this._resolveNewBlockTag(blockTag);

    return numberToRpcQuantity(
      await this._node.getAccountBalance(
        new Address(address),
        blockNumberOrPending
      )
    );
  }

  // eth_getBlockByHash

  private _getBlockByHashParams(params: any[]): [Buffer, boolean] {
    return validateParams(params, rpcHash, t.boolean);
  }

  private async _getBlockByHashAction(
    hash: Buffer,
    includeTransactions: boolean
  ): Promise<RpcBlockOutput | null> {
    const block = await this._node.getBlockByHash(hash);
    if (block === undefined) {
      return null;
    }

    const totalDifficulty = await this._node.getBlockTotalDifficulty(block);

    return getRpcBlock(
      block,
      totalDifficulty,
      shouldShowTransactionTypeForHardfork(this._common),
      includeTransactions
    );
  }

  // eth_getBlockByNumber

  private _getBlockByNumberParams(params: any[]): [RpcOldBlockTag, boolean] {
    return validateParams(params, rpcOldBlockTag, t.boolean);
  }

  private async _getBlockByNumberAction(
    oldBlockTag: RpcOldBlockTag,
    includeTransactions: boolean
  ): Promise<RpcBlockOutput | null> {
    const numberOrPending = await this._resolveOldBlockTag(oldBlockTag);
    if (numberOrPending === undefined) {
      return null;
    }

    let block: Block | undefined;
    let totalDifficulty: bigint | undefined;

    if (numberOrPending === "pending") {
      [block, totalDifficulty] =
        await this._node.getPendingBlockAndTotalDifficulty();
    } else {
      block = await this._node.getBlockByNumber(numberOrPending);
      if (block === undefined) {
        return null;
      }

      totalDifficulty = await this._node.getBlockTotalDifficulty(block);
    }

    return getRpcBlock(
      block,
      totalDifficulty,
      shouldShowTransactionTypeForHardfork(this._common),
      includeTransactions,
      numberOrPending === "pending"
    );
  }

  // eth_getBlockTransactionCountByHash

  private _getBlockTransactionCountByHashParams(params: any[]): [Buffer] {
    return validateParams(params, rpcHash);
  }

  private async _getBlockTransactionCountByHashAction(
    hash: Buffer
  ): Promise<string | null> {
    const block = await this._node.getBlockByHash(hash);
    if (block === undefined) {
      return null;
    }

    return numberToRpcQuantity(block.transactions.length);
  }

  // eth_getBlockTransactionCountByNumber

  private _getBlockTransactionCountByNumberParams(
    params: any[]
  ): [RpcOldBlockTag] {
    return validateParams(params, rpcOldBlockTag);
  }

  private async _getBlockTransactionCountByNumberAction(
    oldBlockTag: RpcOldBlockTag
  ): Promise<string | null> {
    const numberOrPending = await this._resolveOldBlockTag(oldBlockTag);
    if (numberOrPending === undefined) {
      return null;
    }

    const block = await this._node.getBlockByNumber(numberOrPending);
    if (block === undefined) {
      return null;
    }

    return numberToRpcQuantity(block.transactions.length);
  }

  // eth_getCode

  private _getCodeParams(params: any[]): [Buffer, OptionalRpcNewBlockTag] {
    return validateParams(params, rpcAddress, optionalRpcNewBlockTag);
  }

  private async _getCodeAction(
    address: Buffer,
    blockTag: OptionalRpcNewBlockTag
  ): Promise<string> {
    const blockNumberOrPending = await this._resolveNewBlockTag(blockTag);

    return bufferToRpcData(
      await this._node.getCode(new Address(address), blockNumberOrPending)
    );
  }

  // eth_getCompilers

  // eth_getFilterChanges

  private _getFilterChangesParams(params: any[]): [bigint] {
    return validateParams(params, rpcQuantity);
  }

  private async _getFilterChangesAction(
    filterId: bigint
  ): Promise<string[] | RpcLogOutput[] | null> {
    const changes = await this._node.getFilterChanges(filterId);
    if (changes === undefined) {
      return null;
    }

    return changes;
  }

  // eth_getFilterLogs

  private _getFilterLogsParams(params: any[]): [bigint] {
    return validateParams(params, rpcQuantity);
  }

  private async _getFilterLogsAction(
    filterId: bigint
  ): Promise<RpcLogOutput[] | null> {
    const changes = await this._node.getFilterLogs(filterId);
    if (changes === undefined) {
      return null;
    }

    return changes;
  }

  // eth_getLogs

  private _getLogsParams(params: any[]): [RpcFilterRequest] {
    return validateParams(params, rpcFilterRequest);
  }

  private async _rpcFilterRequestToGetLogsParams(
    filter: RpcFilterRequest
  ): Promise<FilterParams> {
    if (filter.blockHash !== undefined) {
      if (filter.fromBlock !== undefined || filter.toBlock !== undefined) {
        throw new InvalidArgumentsError(
          "blockHash is mutually exclusive with fromBlock/toBlock"
        );
      }

      const block = await this._node.getBlockByHash(filter.blockHash);
      if (block === undefined) {
        throw new InvalidArgumentsError("blockHash cannot be found");
      }

      filter.fromBlock = block.header.number;
      filter.toBlock = block.header.number;
    }

    const [fromBlock, toBlock] = await Promise.all([
      this._normalizeOldBlockTagForFilterRequest(filter.fromBlock),
      this._normalizeOldBlockTagForFilterRequest(filter.toBlock),
    ]);

    return {
      fromBlock,
      toBlock,
      normalizedTopics: this._extractNormalizedLogTopics(filter.topics),
      addresses: this._extractLogAddresses(filter.address),
    };
  }

  private async _getLogsAction(
    filter: RpcFilterRequest
  ): Promise<RpcLogOutput[]> {
    const filterParams = await this._rpcFilterRequestToGetLogsParams(filter);
    const logs = await this._node.getLogs(filterParams);
    return cloneDeep(logs);
  }

  // eth_getProof

  // eth_getStorageAt

  private _getStorageAtParams(
    params: any[]
  ): [Buffer, bigint, OptionalRpcNewBlockTag] {
    return validateParams(
      params,
      rpcAddress,
      rpcStorageSlot,
      optionalRpcNewBlockTag
    );
  }

  private async _getStorageAtAction(
    address: Buffer,
    slot: bigint,
    blockTag: OptionalRpcNewBlockTag
  ): Promise<string> {
    const blockNumberOrPending = await this._resolveNewBlockTag(blockTag);

    const data = await this._node.getStorageAt(
      new Address(address),
      slot,
      blockNumberOrPending
    );

    return bufferToRpcData(data);
  }

  // eth_getTransactionByBlockHashAndIndex

  private _getTransactionByBlockHashAndIndexParams(
    params: any[]
  ): [Buffer, bigint] {
    return validateParams(params, rpcHash, rpcQuantity);
  }

  private async _getTransactionByBlockHashAndIndexAction(
    hash: Buffer,
    index: bigint
  ): Promise<RpcTransactionOutput | null> {
    const i = Number(index);
    const block = await this._node.getBlockByHash(hash);
    if (block === undefined) {
      return null;
    }

    const tx = block.transactions[i];
    if (tx === undefined) {
      return null;
    }

    return getRpcTransaction(
      tx,
      shouldShowTransactionTypeForHardfork(this._common),
      block,
      i
    );
  }

  // eth_getTransactionByBlockNumberAndIndex

  private _getTransactionByBlockNumberAndIndexParams(
    params: any[]
  ): [RpcOldBlockTag, bigint] {
    return validateParams(params, rpcOldBlockTag, rpcQuantity);
  }

  private async _getTransactionByBlockNumberAndIndexAction(
    oldBlockTag: RpcOldBlockTag,
    index: bigint
  ): Promise<RpcTransactionOutput | null> {
    const numberOrPending = await this._resolveOldBlockTag(oldBlockTag);
    if (numberOrPending === undefined) {
      return null;
    }

    const block = await this._node.getBlockByNumber(numberOrPending);
    const i = Number(index);

    if (block === undefined) {
      return null;
    }

    const tx = block.transactions[i];
    if (tx === undefined) {
      return null;
    }

    const showTransactionType = shouldShowTransactionTypeForHardfork(
      this._common
    );

    return numberOrPending === "pending"
      ? getRpcTransaction(tx, showTransactionType, "pending")
      : getRpcTransaction(tx, showTransactionType, block, i);
  }

  // eth_getTransactionByHash

  private _getTransactionByHashParams(params: any[]): [Buffer] {
    return validateParams(params, rpcHash);
  }

  private async _getTransactionByHashAction(
    hash: Buffer
  ): Promise<RpcTransactionOutput | null> {
    const pendingTx = await this._node.getPendingTransaction(hash);
    if (pendingTx !== undefined) {
      return getRpcTransaction(
        pendingTx,
        shouldShowTransactionTypeForHardfork(this._common),
        "pending"
      );
    }

    const block = await this._node.getBlockByTransactionHash(hash);
    if (block === undefined) {
      return null;
    }

    const index = block.transactions.findIndex((btx) =>
      btx.hash().equals(hash)
    );
    const tx = block.transactions[index];
    if (tx === undefined) {
      throw new Error(
        "Transaction not found in the saved block, this should never happen"
      );
    }

    return getRpcTransaction(
      tx,
      shouldShowTransactionTypeForHardfork(this._common),
      block,
      index
    );
  }

  // eth_getTransactionCount

  private _getTransactionCountParams(
    params: any[]
  ): [Buffer, OptionalRpcNewBlockTag] {
    return validateParams(params, rpcAddress, optionalRpcNewBlockTag);
  }

  private async _getTransactionCountAction(
    address: Buffer,
    blockTag: OptionalRpcNewBlockTag
  ): Promise<string> {
    const blockNumberOrPending = await this._resolveNewBlockTag(blockTag);

    return numberToRpcQuantity(
      await this._node.getNextConfirmedNonce(
        new Address(address),
        blockNumberOrPending
      )
    );
  }

  // eth_getTransactionReceipt

  private _getTransactionReceiptParams(params: any[]): [Buffer] {
    return validateParams(params, rpcHash);
  }

  private async _getTransactionReceiptAction(
    hash: Buffer
  ): Promise<RpcReceiptOutput | null> {
    const receipt = await this._node.getTransactionReceipt(hash);
    if (receipt === undefined) {
      return null;
    }
    return cloneDeep(receipt);
  }

  // eth_getUncleByBlockHashAndIndex

  // TODO: Implement

  // eth_getUncleByBlockNumberAndIndex

  // TODO: Implement

  // eth_getUncleCountByBlockHash

  // TODO: Implement

  // eth_getUncleCountByBlockNumber

  // TODO: Implement

  // eth_getWork

  // eth_hashrate

  // eth_mining

  private _miningParams(params: any[]): [] {
    return validateParams(params);
  }

  private async _miningAction(): Promise<boolean> {
    return false;
  }

  // eth_newBlockFilter

  private _newBlockFilterParams(_params: any[]): [] {
    return [];
  }

  private async _newBlockFilterAction(): Promise<string> {
    const filterId = await this._node.newBlockFilter(false);
    return numberToRpcQuantity(filterId);
  }

  // eth_newFilter

  private _newFilterParams(params: any[]): [RpcFilterRequest] {
    return validateParams(params, rpcFilterRequest);
  }

  private async _newFilterAction(filter: RpcFilterRequest): Promise<string> {
    const filterParams = await this._rpcFilterRequestToGetLogsParams(filter);
    const filterId = await this._node.newFilter(filterParams, false);
    return numberToRpcQuantity(filterId);
  }

  // eth_newPendingTransactionFilter

  private _newPendingTransactionParams(_params: any[]): [] {
    return [];
  }

  private async _newPendingTransactionAction(): Promise<string> {
    const filterId = await this._node.newPendingTransactionFilter(false);
    return numberToRpcQuantity(filterId);
  }

  // eth_pendingTransactions

  private _pendingTransactionsParams(_params: any[]): [] {
    return [];
  }

  private async _pendingTransactionsAction(): Promise<RpcTransactionOutput[]> {
    const txs = await this._node.getPendingTransactions();
    return txs.map((tx) =>
      getRpcTransaction(
        tx,
        shouldShowTransactionTypeForHardfork(this._common),
        "pending"
      )
    );
  }

  // eth_protocolVersion

  // eth_sendRawTransaction

  private _sendRawTransactionParams(params: any[]): [Buffer] {
    return validateParams(params, rpcData);
  }

  private async _sendRawTransactionAction(rawTx: Buffer): Promise<string> {
    this._validateRawTransactionHardforkRequirements(rawTx);

    let tx: TypedTransaction;
    try {
      tx = TransactionFactory.fromSerializedData(rawTx, {
        common: this._common,
      });
    } catch (error) {
      // This section of the code is incredibly dependant of TransactionFactory.fromSerializedData
      // AccessListEIP2930Transaction.fromSerializedTx and Transaction.fromSerializedTx
      // Please keep it updated.

      if (error instanceof Error) {
        if (error.message === "invalid RLP: remainder must be zero") {
          throw new InvalidArgumentsError("Invalid transaction", error);
        }

        if (error.message.includes("Incompatible EIP155")) {
          throw new InvalidArgumentsError(
            "Trying to send an incompatible EIP-155 transaction, signed for another chain.",
            error
          );
        }

        if (
          error.message.includes("TypedTransaction with ID") &&
          error.message.includes(" unknown")
        ) {
          throw new InvalidArgumentsError(`Invalid transaction`, error);
        }

        if (error.message.includes("The chain ID does not match")) {
          const chainId = this._common.chainId();
          throw new InvalidArgumentsError(
            `Trying to send a raw transaction with an invalid chainId. The expected chainId is ${chainId}`,
            error
          );
        }
      }

      throw error;
    }

    if (!tx.isSigned()) {
      throw new InvalidArgumentsError("Invalid Signature");
    }

    if (tx instanceof Transaction) {
      this._validateEip155HardforkRequirement(tx);
    }

    return this._sendTransactionAndReturnHash(tx);
  }

  // eth_sendTransaction

  private _sendTransactionParams(params: any[]): [RpcTransactionRequest] {
    return validateParams(params, rpcTransactionRequest);
  }

  private async _sendTransactionAction(
    transactionRequest: RpcTransactionRequest
  ): Promise<string> {
    const expectedChainId = this._common.chainId();
    if (
      transactionRequest.chainId !== undefined &&
      transactionRequest.chainId !== expectedChainId
    ) {
      throw new InvalidArgumentsError(
        `Invalid chainId ${transactionRequest.chainId.toString()} provided, expected ${expectedChainId.toString()} instead.`
      );
    }

    this._validateTransactionAndCallRequest(transactionRequest);

    const txParams = await this._rpcTransactionRequestToNodeTransactionParams(
      transactionRequest
    );

    const tx = await this._node.getSignedTransaction(txParams);

    return this._sendTransactionAndReturnHash(tx);
  }

  // eth_sign

  private _signParams(params: any[]): [Buffer, Buffer] {
    return validateParams(params, rpcAddress, rpcData);
  }

  private async _signAction(address: Buffer, data: Buffer): Promise<string> {
    const signature = await this._node.signPersonalMessage(
      new Address(address),
      data
    );

    return toRpcSig(signature.v, signature.r, signature.s);
  }

  // eth_signTransaction

  // eth_signTypedData_v4

  private _signTypedDataV4Params(params: any[]): [Buffer, any] {
    // Validation of the TypedData parameter is handled by eth-sig-util
    return validateParams(params, rpcAddress, t.any);
  }

  private async _signTypedDataV4Action(
    address: Buffer,
    typedData: any
  ): Promise<string> {
    let typedMessage: any = typedData;

    // According to the MetaMask implementation,
    // the message parameter may be JSON stringified in versions later than V1
    // See https://github.com/MetaMask/metamask-extension/blob/0dfdd44ae7728ed02cbf32c564c75b74f37acf77/app/scripts/metamask-controller.js#L1736
    // In fact, ethers.js JSON stringifies the message at the time of writing.
    if (typeof typedData === "string") {
      try {
        typedMessage = JSON.parse(typedData);
      } catch {
        throw new InvalidInputError(
          `The message parameter is an invalid JSON. Either pass a valid JSON or a plain object conforming to EIP712 TypedData schema.`
        );
      }
    }

    return this._node.signTypedDataV4(new Address(address), typedMessage);
  }

  // eth_submitHashrate

  // eth_submitWork

  private _subscribeParams(
    params: any[]
  ): [RpcSubscribeRequest, OptionalRpcFilterRequest] {
    if (params.length === 0) {
      throw new InvalidInputError(
        "Expected subscription name as first argument"
      );
    }

    return validateParams(
      params,
      rpcSubscribeRequest,
      optionalRpcFilterRequest
    );
  }

  private async _subscribeAction(
    subscribeRequest: RpcSubscribeRequest,
    optionalFilterRequest: OptionalRpcFilterRequest
  ): Promise<string> {
    switch (subscribeRequest) {
      case "newHeads":
        return numberToRpcQuantity(await this._node.newBlockFilter(true));
      case "newPendingTransactions":
        return numberToRpcQuantity(
          await this._node.newPendingTransactionFilter(true)
        );
      case "logs":
        if (optionalFilterRequest === undefined) {
          throw new InvalidArgumentsError("missing params argument");
        }

        const filterParams = await this._rpcFilterRequestToGetLogsParams(
          optionalFilterRequest
        );

        return numberToRpcQuantity(
          await this._node.newFilter(filterParams, true)
        );
    }
  }

  // eth_syncing

  private _syncingParams(params: any[]): [] {
    return validateParams(params);
  }

  private async _syncingAction(): Promise<boolean> {
    return false;
  }

  // eth_uninstallFilter

  private _uninstallFilterParams(params: any): [bigint] {
    return validateParams(params, rpcQuantity);
  }

  private async _uninstallFilterAction(filterId: bigint): Promise<boolean> {
    return this._node.uninstallFilter(filterId, false);
  }

  // eth_unsubscribe

  private _unsubscribeParams(params: any[]): [bigint] {
    return validateParams(params, rpcQuantity);
  }

  private async _unsubscribeAction(filterId: bigint): Promise<boolean> {
    return this._node.uninstallFilter(filterId, true);
  }

  // eth_feeHistory

  private _feeHistoryParams(
    params: any[]
  ): [bigint, RpcNewBlockTag, number[] | undefined] {
    const [blockCount, newestBlock, rewardPercentiles] = validateParams(
      params,
      rpcQuantity,
      rpcNewBlockTag,
      optional(t.array(rpcFloat))
    );

    if (blockCount < 1n) {
      throw new InvalidInputError(`blockCount should be at least 1`);
    }

    if (blockCount > 1024n) {
      throw new InvalidInputError(`blockCount should be at most 1024`);
    }

    if (rewardPercentiles !== undefined) {
      for (const [i, p] of rewardPercentiles.entries()) {
        if (p < 0 || p > 100) {
          throw new InvalidInputError(
            `The reward percentile number ${
              i + 1
            } is invalid. It must be a float between 0 and 100, but is ${p} instead.`
          );
        }

        if (i !== 0) {
          const prev = rewardPercentiles[i - 1];
          if (prev > p) {
            throw new InvalidInputError(
              `The reward percentiles should be in non-decreasing order, but the percentile number ${i} is greater than the next one`
            );
          }
        }
      }
    }

    return [blockCount, newestBlock, rewardPercentiles];
  }

  private async _feeHistoryAction(
    blockCount: bigint,
    newestBlock: RpcNewBlockTag,
    rewardPercentiles?: number[]
  ) {
    if (!this._node.isEip1559Active()) {
      throw new InvalidInputError(
        `eth_feeHistory is disabled. It only works with the London hardfork or a later one.`
      );
    }

    const resolvedNewestBlock = await this._resolveNewBlockTag(newestBlock);

    const feeHistory = await this._node.getFeeHistory(
      blockCount,
      resolvedNewestBlock,
      rewardPercentiles ?? []
    );

    const oldestBlock = numberToRpcQuantity(feeHistory.oldestBlock);
    const baseFeePerGas = feeHistory.baseFeePerGas.map(numberToRpcQuantity);
    const gasUsedRatio = feeHistory.gasUsedRatio;
    const reward = feeHistory.reward?.map((rs) => rs.map(numberToRpcQuantity));

    return {
      oldestBlock,
      baseFeePerGas,
      gasUsedRatio,
      reward,
    };
  }

  // Utility methods

  private async _rpcCallRequestToNodeCallParams(
    rpcCall: RpcCallRequest
  ): Promise<CallParams> {
    return {
      to: rpcCall.to,
      from:
        rpcCall.from !== undefined
          ? rpcCall.from
          : await this._getDefaultCallFrom(),
      data: rpcCall.data !== undefined ? rpcCall.data : toBuffer([]),
      gasLimit:
        rpcCall.gas !== undefined ? rpcCall.gas : this._node.getBlockGasLimit(),
      value: rpcCall.value !== undefined ? rpcCall.value : 0n,
      accessList:
        rpcCall.accessList !== undefined
          ? this._rpcAccessListToNodeAccessList(rpcCall.accessList)
          : undefined,
      gasPrice: rpcCall.gasPrice,
      maxFeePerGas: rpcCall.maxFeePerGas,
      maxPriorityFeePerGas: rpcCall.maxPriorityFeePerGas,
    };
  }

  private async _rpcTransactionRequestToNodeTransactionParams(
    rpcTx: RpcTransactionRequest
  ): Promise<TransactionParams> {
    const baseParams = {
      to: rpcTx.to,
      from: rpcTx.from,
      gasLimit:
        rpcTx.gas !== undefined ? rpcTx.gas : this._node.getBlockGasLimit(),
      value: rpcTx.value !== undefined ? rpcTx.value : 0n,
      data: rpcTx.data !== undefined ? rpcTx.data : toBuffer([]),
      nonce:
        rpcTx.nonce !== undefined
          ? rpcTx.nonce
          : await this._node.getAccountNextPendingNonce(
              new Address(rpcTx.from)
            ),
    };

    if (
      this._node.isEip1559Active() &&
      (rpcTx.maxFeePerGas !== undefined ||
        rpcTx.maxPriorityFeePerGas !== undefined ||
        rpcTx.gasPrice === undefined)
    ) {
      const accessList =
        rpcTx.accessList !== undefined
          ? this._rpcAccessListToNodeAccessList(rpcTx.accessList)
          : [];

      if (rpcTx.maxPriorityFeePerGas === undefined) {
        rpcTx.maxPriorityFeePerGas = await this._node.getMaxPriorityFeePerGas();

        // If you only provide a maxFeePerGas, and the suggested tip is higher
        // than that, we adjust the tip to make the tx valid
        if (
          rpcTx.maxFeePerGas !== undefined &&
          rpcTx.maxFeePerGas < rpcTx.maxPriorityFeePerGas
        ) {
          rpcTx.maxPriorityFeePerGas = rpcTx.maxFeePerGas;
        }
      }

      if (rpcTx.maxFeePerGas === undefined) {
        const baseFeePerGas = await this._node.getNextBlockBaseFeePerGas();

        assertHardhatNetworkInvariant(
          baseFeePerGas !== undefined,
          "EIP-1559 transactions should only be sent if the next block has baseFeePerGas"
        );

        rpcTx.maxFeePerGas = 2n * baseFeePerGas + rpcTx.maxPriorityFeePerGas;
      }

      return {
        ...baseParams,
        maxFeePerGas: rpcTx.maxFeePerGas,
        maxPriorityFeePerGas: rpcTx.maxPriorityFeePerGas,
        accessList,
      };
    }

    const gasPrice = rpcTx.gasPrice ?? (await this._node.getGasPrice());

    // AccessList params
    if (rpcTx.accessList !== undefined) {
      return {
        ...baseParams,
        gasPrice,
        accessList: this._rpcAccessListToNodeAccessList(rpcTx.accessList),
      };
    }

    // Legacy params
    return {
      ...baseParams,
      gasPrice,
    };
  }

  private _rpcAccessListToNodeAccessList(
    rpcAccessList: RpcAccessList
  ): Array<[Buffer, Buffer[]]> {
    return rpcAccessList.map((tuple) => [
      tuple.address,
      tuple.storageKeys ?? [],
    ]);
  }

  private async _resolveOldBlockTag(
    oldBlockTag: RpcOldBlockTag
  ): Promise<bigint | "pending" | undefined> {
    if (oldBlockTag === undefined || oldBlockTag === "latest") {
      return this._node.getLatestBlockNumber();
    }

    if (oldBlockTag === "pending") {
      return "pending";
    }

    if (oldBlockTag === "earliest") {
      return 0n;
    }

    if (oldBlockTag === "safe" || oldBlockTag === "finalized") {
      this._checkPostMergeBlockTags(oldBlockTag);

      return this._node.getLatestBlockNumber();
    }

    const block = await this._node.getBlockByNumber(oldBlockTag);
    return block?.header.number;
  }

  private async _resolveNewBlockTag(
    newBlockTag: OptionalRpcNewBlockTag,
    defaultValue: RpcNewBlockTag = "latest"
  ): Promise<bigint | "pending"> {
    if (newBlockTag === undefined) {
      newBlockTag = defaultValue;
    }

    if (newBlockTag === "pending") {
      return "pending";
    }

    if (newBlockTag === "latest") {
      return this._node.getLatestBlockNumber();
    }

    if (newBlockTag === "earliest") {
      return 0n;
    }

    if (newBlockTag === "safe" || newBlockTag === "finalized") {
      this._checkPostMergeBlockTags(newBlockTag);

      return this._node.getLatestBlockNumber();
    }

    if (!BigIntUtils.isBigInt(newBlockTag)) {
      if ("blockNumber" in newBlockTag && "blockHash" in newBlockTag) {
        throw new InvalidArgumentsError(
          "Invalid block tag received. Only one of hash or block number can be used."
        );
      }

      if ("blockNumber" in newBlockTag && "requireCanonical" in newBlockTag) {
        throw new InvalidArgumentsError(
          "Invalid block tag received. requireCanonical only works with hashes."
        );
      }
    }

    let block: Block | undefined;
    if (BigIntUtils.isBigInt(newBlockTag)) {
      block = await this._node.getBlockByNumber(newBlockTag);
    } else if ("blockNumber" in newBlockTag) {
      block = await this._node.getBlockByNumber(newBlockTag.blockNumber);
    } else {
      block = await this._node.getBlockByHash(newBlockTag.blockHash);
    }

    if (block === undefined) {
      const latestBlock = this._node.getLatestBlockNumber();

      throw new InvalidInputError(
        `Received invalid block tag ${this._newBlockTagToString(
          newBlockTag
        )}. Latest block number is ${latestBlock.toString()}`
      );
    }

    return block.header.number;
  }

  private async _normalizeOldBlockTagForFilterRequest(
    blockTag: OptionalRpcOldBlockTag
  ): Promise<bigint> {
    if (
      blockTag === undefined ||
      blockTag === "latest" ||
      blockTag === "pending"
    ) {
      return LATEST_BLOCK;
    }

    if (blockTag === "safe" || blockTag === "finalized") {
      this._checkPostMergeBlockTags(blockTag);

      return LATEST_BLOCK;
    }

    if (blockTag === "earliest") {
      return 0n;
    }

    return blockTag;
  }

  private _newBlockTagToString(tag: RpcNewBlockTag): string {
    if (typeof tag === "string") {
      return tag;
    }

    if (BigIntUtils.isBigInt(tag)) {
      return tag.toString();
    }

    if ("blockNumber" in tag) {
      return tag.blockNumber.toString();
    }

    return bufferToHex(tag.blockHash);
  }

  private _extractNormalizedLogTopics(
    topics: OptionalRpcLogTopics
  ): Array<Array<Buffer | null> | null> {
    if (topics === undefined || topics.length === 0) {
      return [];
    }

    const normalizedTopics: Array<Array<Buffer | null> | null> = [];
    for (const topic of topics) {
      if (Buffer.isBuffer(topic)) {
        normalizedTopics.push([topic]);
      } else {
        normalizedTopics.push(topic);
      }
    }

    return normalizedTopics;
  }

  private _extractLogAddresses(address: OptionalRpcLogAddress): Buffer[] {
    if (address === undefined) {
      return [];
    }

    if (Buffer.isBuffer(address)) {
      return [address];
    }

    return address;
  }

  private async _getDefaultCallFrom(): Promise<Buffer> {
    const localAccounts = await this._node.getLocalAccountAddresses();

    if (localAccounts.length === 0) {
      return toBuffer(zeroAddress());
    }

    return toBuffer(localAccounts[0]);
  }

  private async _sendTransactionAndReturnHash(tx: TypedTransaction) {
    let result = await this._node.sendTransaction(tx);

    if (typeof result === "string") {
      return result;
    }

    if (Array.isArray(result)) {
      if (result.length === 1 && result[0].block.transactions.length > 1) {
        this._logger.logMultipleTransactionsWarning();
      } else if (result.length > 1) {
        this._logger.logMultipleBlocksWarning();
      }
    } else {
      if (result.block.transactions.length > 1) {
        this._logger.logMultipleTransactionsWarning();
      }
      result = [result];
    }

    const trace = await this._handleMineBlockResults(result, tx);

    if (trace.error !== undefined && this._throwOnTransactionFailures) {
      const e = trace.error;

      const returnData = trace.trace?.returnData.toString("hex") ?? "";
      (e as any).data = `0x${returnData}`;
      (e as any).transactionHash = bufferToRpcData(tx.hash());

      throw e;
    }

    return bufferToRpcData(tx.hash());
  }

  /**
   * Returns the trace of the sent tx
   */
  private async _handleMineBlockResults(
    results: MineBlockResult[],
    sentTx: TypedTransaction
  ): Promise<GatherTracesResult> {
    const singleTransactionMined =
      results.length === 1 && results[0].block.transactions.length === 1;

    if (singleTransactionMined) {
      const block = results[0].block;
      const tx = block.transactions[0];
      const txGasUsed = results[0].blockResult.results[0].totalGasSpent;
      const trace = results[0].traces[0];
      await this._logSingleTransaction(tx, block, txGasUsed, trace);

      return trace;
    } else {
      // this happens when automine is enabled, a tx is sent, and there are
      // pending txs in the mempool
      for (const result of results) {
        await this._logBlock(result, sentTx);
      }

      const [sentTxResult, sentTxIndex] = this._getTransactionResultAndIndex(
        sentTx,
        results
      );
      const sentTxTrace = sentTxResult.traces[sentTxIndex];

      if (!singleTransactionMined) {
        const blockNumber = sentTxResult.block.header.number;
        const code = await this._node.getCodeFromTrace(
          sentTxTrace.trace,
          blockNumber
        );

        const { block, blockResult } = sentTxResult;
        const gasUsed = blockResult.results[sentTxIndex].totalGasSpent;
        this._logger.logCurrentlySentTransaction(
          sentTx,
          gasUsed,
          sentTxTrace,
          code,
          block
        );
      }

      return sentTxTrace;
    }
  }

  private async _logSingleTransaction(
    tx: TypedTransaction,
    block: Block,
    txGasUsed: bigint,
    txTrace: GatherTracesResult
  ) {
    const code = await this._node.getCodeFromTrace(
      txTrace.trace,
      block.header.number
    );
    this._logger.logSingleTransaction(tx, block, txGasUsed, txTrace, code);

    await this._runHardhatNetworkMessageTraceHooks(txTrace.trace, false);
  }

  private async _logBlock(result: MineBlockResult, sentTx: TypedTransaction) {
    const { block, traces } = result;

    const codes: Buffer[] = [];
    for (const txTrace of traces) {
      const code = await this._node.getCodeFromTrace(
        txTrace.trace,
        block.header.number
      );

      codes.push(code);
    }

    this._logger.logBlockFromAutomine(result, codes, sentTx.hash());

    this._logger.logEmptyLine();

    for (const txTrace of traces) {
      await this._runHardhatNetworkMessageTraceHooks(txTrace.trace, false);
    }
  }

  private _getTransactionResultAndIndex(
    tx: TypedTransaction,
    results: MineBlockResult[]
  ): [MineBlockResult, number] {
    for (const result of results) {
      const transactions = result.block.transactions;
      for (let i = 0; i < transactions.length; i++) {
        const blockTx = transactions[i];
        if (blockTx.hash().equals(tx.hash())) {
          return [result, i];
        }
      }
    }

    throw new Error(
      "The sent transaction not found in sendTransaction result, this should never happen"
    );
  }

  private async _runHardhatNetworkMessageTraceHooks(
    trace: MessageTrace | undefined,
    isCall: boolean
  ) {
    if (trace === undefined) {
      return;
    }

    for (const hook of this._experimentalHardhatNetworkMessageTraceHooks) {
      await hook(trace, isCall);
    }
  }

  private _validateTransactionAndCallRequest(
    rpcRequest: RpcCallRequest | RpcTransactionRequest
  ) {
    if (
      (rpcRequest.maxFeePerGas !== undefined ||
        rpcRequest.maxPriorityFeePerGas !== undefined) &&
      !this._common.gteHardfork(EIP1559_MIN_HARDFORK)
    ) {
      throw new InvalidArgumentsError(`EIP-1559 style fee params (maxFeePerGas or maxPriorityFeePerGas) received but they are not supported by the current hardfork.

You can use them by running Hardhat Network with 'hardfork' ${EIP1559_MIN_HARDFORK} or later.`);
    }

    // NOTE: This validation should go after the maxFeePerGas one, as EIP-1559
    //  also accepts access list.
    if (
      rpcRequest.accessList !== undefined &&
      !this._common.gteHardfork(ACCESS_LIST_MIN_HARDFORK)
    ) {
      throw new InvalidArgumentsError(`Access list received but is not supported by the current hardfork.

You can use them by running Hardhat Network with 'hardfork' ${ACCESS_LIST_MIN_HARDFORK} or later.`);
    }

    if (
      rpcRequest.gasPrice !== undefined &&
      rpcRequest.maxFeePerGas !== undefined
    ) {
      throw new InvalidInputError(
        "Cannot send both gasPrice and maxFeePerGas params"
      );
    }

    if (
      rpcRequest.gasPrice !== undefined &&
      rpcRequest.maxPriorityFeePerGas !== undefined
    ) {
      throw new InvalidInputError(
        "Cannot send both gasPrice and maxPriorityFeePerGas"
      );
    }

    if (
      rpcRequest.maxFeePerGas !== undefined &&
      rpcRequest.maxPriorityFeePerGas !== undefined &&
      rpcRequest.maxPriorityFeePerGas > rpcRequest.maxFeePerGas
    ) {
      throw new InvalidInputError(
        `maxPriorityFeePerGas (${rpcRequest.maxPriorityFeePerGas.toString()}) is bigger than maxFeePerGas (${rpcRequest.maxFeePerGas.toString()})`
      );
    }
  }

  // TODO: Find a better place for this
  private _validateEip155HardforkRequirement(tx: Transaction) {
    // 27 and 28 are only valid for non-EIP-155 legacy txs
    if (tx.v === 27n || tx.v === 28n) {
      return;
    }

    if (!this._common.gteHardfork(EIP155_MIN_HARDFORK)) {
      throw new InvalidArgumentsError(`Trying to send an EIP-155 transaction, but they are not supported by the current hardfork.

You can use them by running Hardhat Network with 'hardfork' ${EIP155_MIN_HARDFORK} or later.`);
    }
  }

  private _validateRawTransactionHardforkRequirements(rawTx: Buffer) {
    if (rawTx[0] <= 0x7f && rawTx[0] !== 1 && rawTx[0] !== 2) {
      throw new InvalidArgumentsError(`Invalid transaction type ${rawTx[0]}.

Your raw transaction is incorrectly formatted, or Hardhat Network doesn't support this transaction type yet.`);
    }

    if (rawTx[0] === 1 && !this._common.gteHardfork(ACCESS_LIST_MIN_HARDFORK)) {
      throw new InvalidArgumentsError(
        `Trying to send an EIP-2930 transaction but they are not supported by the current hard fork.

You can use them by running Hardhat Network with 'hardfork' ${ACCESS_LIST_MIN_HARDFORK} or later.`
      );
    }

    if (rawTx[0] === 2 && !this._common.gteHardfork(EIP1559_MIN_HARDFORK)) {
      throw new InvalidArgumentsError(
        `Trying to send an EIP-1559 transaction but they are not supported by the current hard fork.

You can use them by running Hardhat Network with 'hardfork' ${EIP1559_MIN_HARDFORK} or later.`
      );
    }
  }

  private _checkPostMergeBlockTags(blockTag: "safe" | "finalized") {
    const isPostMerge = this._node.isPostMergeHardfork();
    const hardfork = this._node.hardfork;

    if (!isPostMerge) {
      throw new InvalidArgumentsError(
        `The '${blockTag}' block tag is not allowed in pre-merge hardforks. You are using the '${hardfork}' hardfork.`
      );
    }
  }
}
