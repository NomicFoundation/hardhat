import Common from "ethereumjs-common";
import { Transaction } from "ethereumjs-tx";
import {
  BN,
  bufferToHex,
  toBuffer,
  toRpcSig,
  zeroAddress,
} from "ethereumjs-util";
import * as t from "io-ts";
import cloneDeep from "lodash/cloneDeep";

import { BoundExperimentalHardhatNetworkMessageTraceHook } from "../../../../types";
import { MessageTrace } from "../../stack-traces/message-trace";
import {
  InvalidArgumentsError,
  InvalidInputError,
  MethodNotFoundError,
  MethodNotSupportedError,
} from "../errors";
import { LATEST_BLOCK } from "../filter";
import {
  BlockTag,
  blockTag as blockTagType,
  LogAddress,
  LogTopics,
  OptionalBlockTag,
  optionalBlockTag,
  OptionalRpcFilterRequest,
  optionalRpcFilterRequest,
  rpcAddress,
  rpcCallRequest,
  RpcCallRequest,
  rpcData,
  RpcFilterRequest,
  rpcFilterRequest,
  rpcHash,
  rpcQuantity,
  rpcSubscribeRequest,
  RpcSubscribeRequest,
  rpcTransactionRequest,
  RpcTransactionRequest,
  rpcUnknown,
  validateParams,
} from "../input";
import { HardhatNode } from "../node";
import {
  CallParams,
  FilterParams,
  GatherTracesResult,
  MineBlockResult,
  TransactionParams,
} from "../node-types";
import {
  bufferToRpcData,
  getRpcBlock,
  getRpcTransaction,
  numberToRpcQuantity,
  RpcBlockOutput,
  RpcLogOutput,
  RpcReceiptOutput,
  RpcTransactionOutput,
} from "../output";
import { Block } from "../types/Block";

import { ModulesLogger } from "./logger";

// tslint:disable only-hardhat-error
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
    const blockNumber = await this._node.getLatestBlockNumber();
    return numberToRpcQuantity(blockNumber);
  }

  // eth_call

  private _callParams(params: any[]): [RpcCallRequest, OptionalBlockTag] {
    return validateParams(params, rpcCallRequest, optionalBlockTag);
  }

  private async _callAction(
    rpcCall: RpcCallRequest,
    blockTag: OptionalBlockTag
  ): Promise<string> {
    const blockNumberOrPending = await this._resolveBlockTag(blockTag);

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
      throw error;
    }

    return bufferToRpcData(returnData);
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
    return bufferToHex(this._node.getCoinbaseAddress());
  }

  // eth_compileLLL

  // eth_compileSerpent

  // eth_compileSolidity

  // eth_estimateGas

  private _estimateGasParams(
    params: any[]
  ): [RpcTransactionRequest, OptionalBlockTag] {
    return validateParams(params, rpcTransactionRequest, optionalBlockTag);
  }

  private async _estimateGasAction(
    transactionRequest: RpcTransactionRequest,
    blockTag: OptionalBlockTag
  ): Promise<string> {
    // estimateGas behaves differently when there's no blockTag
    // it uses "pending" as default instead of "latest"
    const blockNumberOrPending =
      blockTag === undefined
        ? "pending"
        : await this._resolveBlockTag(blockTag);

    const txParams = await this._rpcTransactionRequestToNodeTransactionParams(
      transactionRequest
    );

    const {
      estimation,
      error,
      trace,
      consoleLogMessages,
    } = await this._node.estimateGas(txParams, blockNumberOrPending);

    const code = await this._node.getCodeFromTrace(trace, blockNumberOrPending);

    if (error !== undefined) {
      this._logger.logEstimateGasTrace(
        txParams,
        code,
        trace,
        consoleLogMessages,
        error
      );

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

  private _getBalanceParams(params: any[]): [Buffer, OptionalBlockTag] {
    return validateParams(params, rpcAddress, optionalBlockTag);
  }

  private async _getBalanceAction(
    address: Buffer,
    blockTag: OptionalBlockTag
  ): Promise<string> {
    const blockNumberOrPending = await this._resolveBlockTag(blockTag);

    return numberToRpcQuantity(
      await this._node.getAccountBalance(address, blockNumberOrPending)
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

    return getRpcBlock(block, totalDifficulty, includeTransactions);
  }

  // eth_getBlockByNumber

  private _getBlockByNumberParams(params: any[]): [BlockTag, boolean] {
    return validateParams(params, blockTagType, t.boolean);
  }

  private async _getBlockByNumberAction(
    tag: BlockTag,
    includeTransactions: boolean
  ): Promise<RpcBlockOutput | null> {
    let block: Block | undefined;
    let totalDifficulty: BN | undefined;

    if (typeof tag === "string") {
      if (tag === "earliest") {
        block = await this._node.getBlockByNumber(new BN(0));
      } else if (tag === "latest") {
        block = await this._node.getLatestBlock();
      } else {
        [
          block,
          totalDifficulty,
        ] = await this._node.getPendingBlockAndTotalDifficulty();
      }
    } else if (BN.isBN(tag)) {
      block = await this._node.getBlockByNumber(tag);
    } else if (Buffer.isBuffer(tag)) {
      block = await this._node.getBlockByHash(tag);
    }

    if (block === undefined) {
      return null;
    }

    if (totalDifficulty === undefined) {
      totalDifficulty = await this._node.getBlockTotalDifficulty(block);
    }

    return getRpcBlock(
      block,
      totalDifficulty,
      includeTransactions,
      tag === "pending"
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

  private _getBlockTransactionCountByNumberParams(params: any[]): [BlockTag] {
    return validateParams(params, blockTagType);
  }

  private async _getBlockTransactionCountByNumberAction(
    blockTag: BlockTag
  ): Promise<string | null> {
    const block = await this._getBlockByBlockTag(blockTag);

    if (block === null) {
      return null;
    }

    return numberToRpcQuantity(block.transactions.length);
  }

  // eth_getCode

  private _getCodeParams(params: any[]): [Buffer, OptionalBlockTag] {
    return validateParams(params, rpcAddress, optionalBlockTag);
  }

  private async _getCodeAction(
    address: Buffer,
    blockTag: OptionalBlockTag
  ): Promise<string> {
    const blockNumberOrPending = await this._resolveBlockTag(blockTag);

    return bufferToRpcData(
      await this._node.getCode(address, blockNumberOrPending)
    );
  }

  // eth_getCompilers

  // eth_getFilterChanges

  private _getFilterChangesParams(params: any[]): [BN] {
    return validateParams(params, rpcQuantity);
  }

  private async _getFilterChangesAction(
    filterId: BN
  ): Promise<string[] | RpcLogOutput[] | null> {
    const changes = await this._node.getFilterChanges(filterId);
    if (changes === undefined) {
      return null;
    }

    return changes;
  }

  // eth_getFilterLogs

  private _getFilterLogsParams(params: any[]): [BN] {
    return validateParams(params, rpcQuantity);
  }

  private async _getFilterLogsAction(
    filterId: BN
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

      filter.fromBlock = new BN(block.header.number);
      filter.toBlock = new BN(block.header.number);
    }

    const [fromBlock, toBlock] = await Promise.all([
      this._extractBlock(filter.fromBlock),
      this._extractBlock(filter.toBlock),
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

  private _getStorageAtParams(params: any[]): [Buffer, BN, OptionalBlockTag] {
    return validateParams(params, rpcAddress, rpcQuantity, optionalBlockTag);
  }

  private async _getStorageAtAction(
    address: Buffer,
    slot: BN,
    blockTag: OptionalBlockTag
  ): Promise<string> {
    const blockNumberOrPending = await this._resolveBlockTag(blockTag);

    const data = await this._node.getStorageAt(
      address,
      slot,
      blockNumberOrPending
    );

    return bufferToRpcData(data);
  }

  // eth_getTransactionByBlockHashAndIndex

  private _getTransactionByBlockHashAndIndexParams(
    params: any[]
  ): [Buffer, BN] {
    return validateParams(params, rpcHash, rpcQuantity);
  }

  private async _getTransactionByBlockHashAndIndexAction(
    hash: Buffer,
    index: BN
  ): Promise<RpcTransactionOutput | null> {
    const i = index.toNumber();
    const block = await this._node.getBlockByHash(hash);
    if (block === undefined) {
      return null;
    }

    const tx = block.transactions[i];
    if (tx === undefined) {
      return null;
    }

    return getRpcTransaction(tx, block, i);
  }

  // eth_getTransactionByBlockNumberAndIndex

  private _getTransactionByBlockNumberAndIndexParams(
    params: any[]
  ): [BlockTag, BN] {
    return validateParams(params, blockTagType, rpcQuantity);
  }

  private async _getTransactionByBlockNumberAndIndexAction(
    blockTag: BlockTag,
    index: BN
  ): Promise<RpcTransactionOutput | null> {
    const i = index.toNumber();
    const block = await this._getBlockByBlockTag(blockTag);

    if (block === null) {
      return null;
    }

    const tx = block.transactions[i];
    if (tx === undefined) {
      return null;
    }

    return blockTag === "pending"
      ? getRpcTransaction(tx, "pending")
      : getRpcTransaction(tx, block, i);
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
      return getRpcTransaction(pendingTx, "pending");
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

    return getRpcTransaction(tx, block, index);
  }

  // eth_getTransactionCount

  private _getTransactionCountParams(
    params: any[]
  ): [Buffer, OptionalBlockTag] {
    return validateParams(params, rpcAddress, optionalBlockTag);
  }

  private async _getTransactionCountAction(
    address: Buffer,
    blockTag: OptionalBlockTag
  ): Promise<string> {
    const blockNumberOrPending = await this._resolveBlockTag(blockTag);

    return numberToRpcQuantity(
      await this._node.getAccountNonce(address, blockNumberOrPending)
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

  private _newBlockFilterParams(params: any[]): [] {
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

  private _newPendingTransactionParams(params: any[]): [] {
    return [];
  }

  private async _newPendingTransactionAction(): Promise<string> {
    const filterId = await this._node.newPendingTransactionFilter(false);
    return numberToRpcQuantity(filterId);
  }

  // eth_pendingTransactions

  private _pendingTransactionsParams(params: any[]): [] {
    return [];
  }

  private async _pendingTransactionsAction(): Promise<RpcTransactionOutput[]> {
    const txs = await this._node.getPendingTransactions();
    return txs.map((tx) => getRpcTransaction(tx, "pending"));
  }

  // eth_protocolVersion

  // eth_sendRawTransaction

  private _sendRawTransactionParams(params: any[]): [Buffer] {
    return validateParams(params, rpcData);
  }

  private async _sendRawTransactionAction(rawTx: Buffer): Promise<string> {
    let tx: Transaction;
    try {
      tx = new Transaction(rawTx, { common: this._common });
    } catch (error) {
      if (error.message === "invalid remainder") {
        throw new InvalidInputError("Invalid transaction");
      }

      if (error.message.includes("EIP155")) {
        throw new InvalidInputError(error.message);
      }

      throw error;
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
    const signature = await this._node.signPersonalMessage(address, data);

    return toRpcSig(signature.v, signature.r, signature.s);
  }

  // eth_signTransaction

  // eth_signTypedData_v4

  private _signTypedDataV4Params(params: any[]): [Buffer, any] {
    // Validation of the TypedData parameter is handled by eth-sig-util
    return validateParams(params, rpcAddress, rpcUnknown);
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
      } catch (error) {
        throw new InvalidInputError(
          `The message parameter is an invalid JSON. Either pass a valid JSON or a plain object conforming to EIP712 TypedData schema.`
        );
      }
    }

    return this._node.signTypedDataV4(address, typedMessage);
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

  private _uninstallFilterParams(params: any): [BN] {
    return validateParams(params, rpcQuantity);
  }

  private async _uninstallFilterAction(filterId: BN): Promise<boolean> {
    return this._node.uninstallFilter(filterId, false);
  }

  private _unsubscribeParams(params: any[]): [BN] {
    return validateParams(params, rpcQuantity);
  }

  private async _unsubscribeAction(filterId: BN): Promise<boolean> {
    return this._node.uninstallFilter(filterId, true);
  }

  // Utility methods

  private async _rpcCallRequestToNodeCallParams(
    rpcCall: RpcCallRequest
  ): Promise<CallParams> {
    return {
      to: rpcCall.to !== undefined ? rpcCall.to : Buffer.from([]),
      from:
        rpcCall.from !== undefined
          ? rpcCall.from
          : await this._getDefaultCallFrom(),
      data: rpcCall.data !== undefined ? rpcCall.data : toBuffer([]),
      gasLimit:
        rpcCall.gas !== undefined ? rpcCall.gas : this._node.getBlockGasLimit(),
      gasPrice:
        rpcCall.gasPrice !== undefined
          ? rpcCall.gasPrice
          : await this._node.getGasPrice(),
      value: rpcCall.value !== undefined ? rpcCall.value : new BN(0),
    };
  }

  private async _rpcTransactionRequestToNodeTransactionParams(
    rpcTx: RpcTransactionRequest
  ): Promise<TransactionParams> {
    return {
      to: rpcTx.to !== undefined ? rpcTx.to : Buffer.from([]),
      from: rpcTx.from,
      gasLimit:
        rpcTx.gas !== undefined ? rpcTx.gas : this._node.getBlockGasLimit(),
      gasPrice:
        rpcTx.gasPrice !== undefined
          ? rpcTx.gasPrice
          : await this._node.getGasPrice(),
      value: rpcTx.value !== undefined ? rpcTx.value : new BN(0),
      data: rpcTx.data !== undefined ? rpcTx.data : toBuffer([]),
      nonce:
        rpcTx.nonce !== undefined
          ? rpcTx.nonce
          : await this._node.getAccountExecutableNonce(rpcTx.from),
    };
  }

  private async _resolveBlockTag(
    blockTag: OptionalBlockTag
  ): Promise<BN | "pending"> {
    if (blockTag === "pending") {
      return "pending";
    }

    if (blockTag === undefined || blockTag === "latest") {
      return this._node.getLatestBlockNumber();
    }

    if (blockTag === "earliest") {
      return new BN(0);
    }

    let block: Block | undefined;
    if (BN.isBN(blockTag)) {
      block = await this._node.getBlockByNumber(blockTag);
    } else if (Buffer.isBuffer(blockTag)) {
      block = await this._node.getBlockByHash(blockTag);
    }

    if (block === undefined) {
      const latestBlock = await this._node.getLatestBlockNumber();

      throw new InvalidInputError(
        `Received invalid block tag ${this._blockTagToString(
          blockTag
        )}. Latest block number is ${latestBlock.toString()}`
      );
    }

    return new BN(block.header.number);
  }

  private async _resolveBlockTagAndReturnNullIfInvalid(blockTag: BlockTag) {
    let blockNumberOrPending: BN | "pending";
    try {
      blockNumberOrPending = await this._resolveBlockTag(blockTag);
    } catch (error) {
      if (error.message.includes("Received invalid block tag")) {
        return null;
      }

      throw error;
    }

    return blockNumberOrPending;
  }

  private async _getBlockByBlockTag(blockTag: BlockTag) {
    let blockNumberOrPending: BN | "pending" | null;
    let block: Block | undefined;

    blockNumberOrPending = await this._resolveBlockTagAndReturnNullIfInvalid(
      blockTag
    );

    if (blockNumberOrPending === null) {
      return null;
    }

    block = await this._node.getBlockByNumber(blockNumberOrPending);
    if (block === undefined) {
      return null;
    }

    return block;
  }

  private async _extractBlock(blockTag: OptionalBlockTag): Promise<BN> {
    if (BN.isBN(blockTag)) {
      return blockTag;
    }

    if (Buffer.isBuffer(blockTag)) {
      const block = await this._node.getBlockByHash(blockTag);

      if (block === undefined) {
        throw new InvalidInputError(
          `Received invalid block tag ${this._blockTagToString(
            blockTag
          )}. This block doesn't exist.`
        );
      }

      return new BN(block.header.number);
    }

    switch (blockTag) {
      case "earliest":
        return new BN(0);
      case undefined:
      case "latest":
        return LATEST_BLOCK;
      case "pending":
      default:
        return LATEST_BLOCK;
    }
  }

  private _blockTagToString(tag: BlockTag): string {
    if (typeof tag === "string") {
      return tag;
    }

    if (BN.isBN(tag)) {
      return tag.toString();
    }

    return bufferToHex(tag);
  }

  private _extractNormalizedLogTopics(
    topics: LogTopics
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

  private _extractLogAddresses(address: LogAddress): Buffer[] {
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

  private async _sendTransactionAndReturnHash(tx: Transaction) {
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

    await this._handleMineBlockResults(result, tx);

    return bufferToRpcData(tx.hash());
  }

  private async _handleMineBlockResults(
    results: MineBlockResult[],
    sentTx: Transaction
  ) {
    const singleTransactionMined =
      results.length === 1 && results[0].block.transactions.length === 1;

    if (singleTransactionMined) {
      const block = results[0].block;
      const tx = block.transactions[0];
      const txGasUsed = results[0].blockResult.results[0].gasUsed.toNumber();
      const trace = results[0].traces[0];
      await this._logSingleTransaction(tx, block, txGasUsed, trace);

      const txError = trace.error;
      if (txError !== undefined && this._throwOnTransactionFailures) {
        throw txError;
      }
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
          new BN(blockNumber)
        );

        const { block, blockResult } = sentTxResult;
        const gasUsed = blockResult.results[sentTxIndex].gasUsed.toNumber();
        this._logger.logCurrentlySentTransaction(
          sentTx,
          gasUsed,
          sentTxTrace,
          code,
          block
        );
      }

      const sentTxError = sentTxTrace.error;
      if (sentTxError !== undefined && this._throwOnTransactionFailures) {
        throw sentTxError;
      }
    }
  }

  private async _logSingleTransaction(
    tx: Transaction,
    block: Block,
    txGasUsed: number,
    txTrace: GatherTracesResult
  ) {
    const code = await this._node.getCodeFromTrace(
      txTrace.trace,
      new BN(block.header.number)
    );
    this._logger.logSingleTransaction(tx, block, txGasUsed, txTrace, code);

    await this._runHardhatNetworkMessageTraceHooks(txTrace.trace, false);
  }

  private async _logBlock(result: MineBlockResult, sentTx: Transaction) {
    const { block, traces } = result;

    const codes: Buffer[] = [];
    for (const txTrace of traces) {
      const code = await this._node.getCodeFromTrace(
        txTrace.trace,
        new BN(block.header.number)
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
    tx: Transaction,
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
}
