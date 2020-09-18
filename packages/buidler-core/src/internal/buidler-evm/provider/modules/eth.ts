import { RunBlockResult } from "@nomiclabs/ethereumjs-vm/dist/runBlock";
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
import util from "util";

import { BoundExperimentalBuidlerEVMMessageTraceHook } from "../../../../types";
import { weiToHumanReadableString } from "../../../util/wei-values";
import {
  isCreateTrace,
  isPrecompileTrace,
  MessageTrace,
} from "../../stack-traces/message-trace";
import { ContractFunctionType } from "../../stack-traces/model";
import {
  FALLBACK_FUNCTION_NAME,
  RECEIVE_FUNCTION_NAME,
  UNRECOGNIZED_CONTRACT_NAME,
  UNRECOGNIZED_FUNCTION_NAME,
} from "../../stack-traces/solidity-stack-trace";
import {
  InvalidArgumentsError,
  InvalidInputError,
  MethodNotFoundError,
  MethodNotSupportedError,
} from "../errors";
import { LATEST_BLOCK } from "../filter";
import {
  LogAddress,
  LogTopics,
  OptionalBlockTag,
  optionalBlockTag,
  optionalRpcFilterRequest,
  OptionalRpcFilterRequest,
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
import {
  Block,
  BuidlerNode,
  CallParams,
  FilterParams,
  TransactionParams,
} from "../node";
import {
  bufferToRpcData,
  getRpcBlock,
  getRpcTransaction,
  getRpcTransactionReceipt,
  numberToRpcQuantity,
  RpcBlockOutput,
  RpcLogOutput,
  RpcTransactionOutput,
  RpcTransactionReceiptOutput,
} from "../output";

import { ModulesLogger } from "./logger";

// tslint:disable only-buidler-error
export class EthModule {
  constructor(
    private readonly _common: Common,
    private readonly _node: BuidlerNode,
    private readonly _throwOnTransactionFailures: boolean,
    private readonly _throwOnCallFailures: boolean,
    private readonly _logger?: ModulesLogger,
    private readonly _experimentalBuidlerEVMMessageTraceHooks: BoundExperimentalBuidlerEVMMessageTraceHook[] = []
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
        throw new MethodNotSupportedError(`Method ${method} is not supported`);

      case "eth_compileSerpent":
        throw new MethodNotSupportedError(`Method ${method} is not supported`);

      case "eth_compileSolidity":
        throw new MethodNotSupportedError(`Method ${method} is not supported`);

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
        throw new MethodNotSupportedError(`Method ${method} is not supported`);

      case "eth_getFilterChanges":
        return this._getFilterChangesAction(
          ...this._getFilterChangesParams(params)
        );

      case "eth_getFilterLogs":
        return this._getFilterLogsAction(...this._getFilterLogsParams(params));

      case "eth_getLogs":
        return this._getLogsAction(...this._getLogsParams(params));

      case "eth_getProof":
        throw new MethodNotSupportedError(`Method ${method} is not supported`);

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
        throw new MethodNotSupportedError(`Method ${method} is not supported`);

      case "eth_getUncleByBlockNumberAndIndex":
        throw new MethodNotSupportedError(`Method ${method} is not supported`);

      case "eth_getUncleCountByBlockHash":
        throw new MethodNotSupportedError(`Method ${method} is not supported`);

      case "eth_getUncleCountByBlockNumber":
        throw new MethodNotSupportedError(`Method ${method} is not supported`);

      case "eth_getWork":
        throw new MethodNotSupportedError(`Method ${method} is not supported`);

      case "eth_hashrate":
        throw new MethodNotSupportedError(`Method ${method} is not supported`);

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
        throw new MethodNotSupportedError(`Method ${method} is not supported`);

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
        throw new MethodNotSupportedError(`Method ${method} is not supported`);

      case "eth_signTypedData":
        return this._signTypedDataAction(...this._signTypedDataParams(params));

      case "eth_submitHashrate":
        throw new MethodNotSupportedError(`Method ${method} is not supported`);

      case "eth_submitWork":
        throw new MethodNotSupportedError(`Method ${method} is not supported`);

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
    const blockNumber = await this._blockTagToBlockNumber(blockTag);

    const callParams = await this._rpcCallRequestToNodeCallParams(rpcCall);
    const {
      result: returnData,
      trace,
      error,
      consoleLogMessages,
    } = await this._node.runCall(callParams, blockNumber);

    await this._logCallTrace(callParams, trace);

    this._logConsoleLogMessages(consoleLogMessages);

    await this._runBuidlerEVMMessageTraceHooks(trace, true);

    if (error !== undefined) {
      if (this._throwOnCallFailures) {
        throw error;
      }

      // TODO: This is a little duplicated with the provider, it should be
      //  refactored away
      // TODO: This will log the error, but the RPC method won't be red
      this._logError(error);
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
    return bufferToHex(await this._node.getCoinbaseAddress());
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
    const blockNumber = await this._blockTagToBlockNumber(blockTag);

    const txParams = await this._rpcTransactionRequestToNodeTransactionParams(
      transactionRequest
    );

    const {
      estimation,
      error,
      trace,
      consoleLogMessages,
    } = await this._node.estimateGas(txParams, blockNumber);

    if (error !== undefined) {
      await this._logEstimateGasTrace(txParams, trace);

      this._logConsoleLogMessages(consoleLogMessages);

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
    const blockNumber = await this._blockTagToBlockNumber(blockTag);

    return numberToRpcQuantity(
      await this._node.getAccountBalance(address, blockNumber)
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

  private _getBlockByNumberParams(params: any[]): [OptionalBlockTag, boolean] {
    return validateParams(params, optionalBlockTag, t.boolean);
  }

  private async _getBlockByNumberAction(
    tag: OptionalBlockTag,
    includeTransactions: boolean
  ): Promise<RpcBlockOutput | null> {
    let block: Block;

    if (typeof tag === "string") {
      if (tag === "earliest") {
        block = await this._node.getBlockByNumber(new BN(0));
      } else if (tag === "latest") {
        block = await this._node.getLatestBlock();
      } else {
        throw new InvalidInputError(
          `eth_getBlockByNumber doesn't support ${tag}`
        );
      }
    } else {
      // The tag can't be undefined because the includeTransactions param is
      // required.
      // TODO: Make this more explicit
      block = await this._node.getBlockByNumber(tag!);
    }

    if (block === undefined) {
      return null;
    }

    const totalDifficulty = await this._node.getBlockTotalDifficulty(block);

    return getRpcBlock(block, totalDifficulty, includeTransactions);
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

  private _getBlockTransactionCountByNumberParams(params: any[]): [BN] {
    return validateParams(params, rpcQuantity);
  }

  private async _getBlockTransactionCountByNumberAction(
    blockNumber: BN
  ): Promise<string | null> {
    const block = await this._node.getBlockByNumber(blockNumber);
    if (block === undefined) {
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
    const blockNumber = await this._blockTagToBlockNumber(blockTag);

    return bufferToRpcData(await this._node.getCode(address, blockNumber));
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

    return {
      fromBlock: this._extractBlock(filter.fromBlock),
      toBlock: this._extractBlock(filter.toBlock),
      normalizedTopics: this._extractNormalizedLogTopics(filter.topics),
      addresses: this._extractLogAddresses(filter.address),
    };
  }

  private async _getLogsAction(
    filter: RpcFilterRequest
  ): Promise<RpcLogOutput[]> {
    const filterParams = await this._rpcFilterRequestToGetLogsParams(filter);
    return this._node.getLogs(filterParams);
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
    const blockNumber = await this._blockTagToBlockNumber(blockTag);

    const data = await this._node.getStorageAt(address, slot, blockNumber);

    // data should always be 32 bytes, but we are imitating Ganache here.
    // Please read the comment in `getStorageAt`.
    if (data.length === 0) {
      return "0x0";
    }

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

  private _getTransactionByBlockNumberAndIndexParams(params: any[]): [BN, BN] {
    return validateParams(params, rpcQuantity, rpcQuantity);
  }

  private async _getTransactionByBlockNumberAndIndexAction(
    blockNumber: BN,
    index: BN
  ): Promise<RpcTransactionOutput | null> {
    const i = index.toNumber();
    const block = await this._node.getBlockByNumber(blockNumber);
    if (block === undefined) {
      return null;
    }

    const tx = block.transactions[i];
    if (tx === undefined) {
      return null;
    }

    return getRpcTransaction(tx, block, i);
  }

  // eth_getTransactionByHash

  private _getTransactionByHashParams(params: any[]): [Buffer] {
    return validateParams(params, rpcHash);
  }

  private async _getTransactionByHashAction(
    hash: Buffer
  ): Promise<RpcTransactionOutput | null> {
    const tx = await this._node.getSuccessfulTransactionByHash(hash);
    if (tx === undefined) {
      return null;
    }

    const block = await this._node.getBlockByTransactionHash(hash);

    let index: number | undefined;
    if (block !== undefined) {
      const transactions: Transaction[] = block.transactions;
      const i = transactions.findIndex((bt) => bt.hash().equals(hash));

      if (i !== -1) {
        index = i;
      }
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
    // TODO: MetaMask does some eth_getTransactionCount(sender, currentBlock)
    //   calls right after sending a transaction.
    //   As we insta-mine, the currentBlock that they send is different from the
    //   one we have, which results on an error.
    //   This is not a big deal TBH, MM eventually resynchronizes, but it shows
    //   some hard to understand errors to our users.
    //   To avoid confusing our users, we have a special case here, just
    //   for now.
    //   This should be changed ASAP.
    if (
      BN.isBN(blockTag) &&
      blockTag.eq((await this._node.getLatestBlockNumber()).subn(1))
    ) {
      return numberToRpcQuantity(
        await this._node.getAccountNonceInPreviousBlock(address)
      );
    }

    const blockNumber = await this._blockTagToBlockNumber(blockTag);

    return numberToRpcQuantity(
      await this._node.getAccountNonce(address, blockNumber)
    );
  }

  // eth_getTransactionReceipt

  private _getTransactionReceiptParams(params: any[]): [Buffer] {
    return validateParams(params, rpcHash);
  }

  private async _getTransactionReceiptAction(
    hash: Buffer
  ): Promise<RpcTransactionReceiptOutput | null> {
    // We do not return receipts for failed transactions
    const tx = await this._node.getSuccessfulTransactionByHash(hash);

    if (tx === undefined) {
      return null;
    }

    const block = (await this._node.getBlockByTransactionHash(hash))!;

    const transactions: Transaction[] = block.transactions;
    const index = transactions.findIndex((bt) => bt.hash().equals(hash));

    const txBlockResults = await this._node.getTxBlockResults(block);

    return getRpcTransactionReceipt(tx, block, index, txBlockResults!);
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
    return txs.map((tx) => getRpcTransaction(tx));
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

  // eth_signTypedData

  private _signTypedDataParams(params: any[]): [Buffer, any] {
    return validateParams(params, rpcAddress, rpcUnknown);
  }

  private async _signTypedDataAction(
    address: Buffer,
    typedData: any
  ): Promise<string> {
    return this._node.signTypedData(address, typedData);
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
        rpcCall.gas !== undefined
          ? rpcCall.gas
          : await this._node.getBlockGasLimit(),
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
        rpcTx.gas !== undefined
          ? rpcTx.gas
          : await this._node.getBlockGasLimit(),
      gasPrice:
        rpcTx.gasPrice !== undefined
          ? rpcTx.gasPrice
          : await this._node.getGasPrice(),
      value: rpcTx.value !== undefined ? rpcTx.value : new BN(0),
      data: rpcTx.data !== undefined ? rpcTx.data : toBuffer([]),
      nonce:
        rpcTx.nonce !== undefined
          ? rpcTx.nonce
          : await this._node.getAccountNonce(rpcTx.from, null),
    };
  }

  private async _blockTagToBlockNumber(
    blockTag: OptionalBlockTag
  ): Promise<BN | null> {
    if (blockTag === "pending") {
      return null;
    }

    let block: Block;
    if (blockTag === undefined || blockTag === "latest") {
      block = await this._node.getLatestBlock();
    } else {
      let blockNumber: number = 0;
      if (blockTag !== "earliest") {
        blockNumber = blockTag.toNumber();
      }

      block = await this._node.getBlockByNumber(new BN(blockNumber));
    }

    return new BN(block.header.number);
  }

  private _extractBlock(blockTag: OptionalBlockTag): BN {
    switch (blockTag) {
      case "earliest":
        return new BN(0);
      case undefined:
      case "latest":
        return LATEST_BLOCK;
      case "pending":
        return LATEST_BLOCK;
    }

    return blockTag;
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

  private async _logEstimateGasTrace(
    txParams: TransactionParams,
    trace: MessageTrace
  ) {
    await this._logContractAndFunctionName(trace, true);
    this._logFrom(txParams.from);
    this._logTo(trace, txParams.to);
    this._logValue(new BN(txParams.value));
  }

  private async _logTransactionTrace(
    tx: Transaction,
    trace: MessageTrace,
    block: Block,
    blockResult: RunBlockResult
  ) {
    if (this._logger === undefined) {
      return;
    }

    await this._logContractAndFunctionName(trace, false);
    this._logger.logWithTitle("Transaction", bufferToHex(tx.hash(true)));
    this._logFrom(tx.getSenderAddress());
    this._logTo(trace, tx.to);
    this._logValue(new BN(tx.value));
    this._logger.logWithTitle(
      "Gas used",
      `${new BN(blockResult.receipts[0].gasUsed).toString(10)} of ${new BN(
        tx.gasLimit
      ).toString(10)}`
    );
    this._logger.logWithTitle(
      `Block #${new BN(block.header.number).toString(10)}`,
      bufferToHex(block.hash())
    );
  }

  private _logConsoleLogMessages(messages: string[]) {
    // This is a especial case, as we always want to print the console.log
    // messages. The difference is how.
    // If we have a logger, we should use that, so that logs are printed in
    // order. If we don't, we just print the messages here.
    if (this._logger === undefined) {
      for (const msg of messages) {
        console.log(msg);
      }
      return;
    }

    if (messages.length === 0) {
      return;
    }

    this._logger.log("");

    this._logger.log("console.log:");
    for (const msg of messages) {
      this._logger.log(`  ${msg}`);
    }
  }

  private async _logCallTrace(callParams: CallParams, trace: MessageTrace) {
    if (this._logger === undefined) {
      return;
    }

    await this._logContractAndFunctionName(trace, true);
    this._logFrom(callParams.from);
    this._logTo(trace, callParams.to);
    if (callParams.value.gtn(0)) {
      this._logValue(callParams.value);
    }
  }

  private async _logContractAndFunctionName(
    trace: MessageTrace,
    shouldBeContract: boolean
  ) {
    if (this._logger === undefined) {
      return;
    }

    if (isPrecompileTrace(trace)) {
      this._logger.logWithTitle(
        "Precompile call",
        `<PrecompileContract ${trace.precompile}>`
      );
      return;
    }

    if (isCreateTrace(trace)) {
      if (trace.bytecode === undefined) {
        this._logger.logWithTitle(
          "Contract deployment",
          UNRECOGNIZED_CONTRACT_NAME
        );
      } else {
        this._logger.logWithTitle(
          "Contract deployment",
          trace.bytecode.contract.name
        );
      }

      if (trace.deployedContract !== undefined && trace.error === undefined) {
        this._logger.logWithTitle(
          "Contract address",
          bufferToHex(trace.deployedContract)
        );
      }

      return;
    }

    const code = await this._node.getCode(trace.address, null);
    if (code.length === 0) {
      if (shouldBeContract) {
        this._logger.log(`WARNING: Calling an account which is not a contract`);
      }

      return;
    }

    if (trace.bytecode === undefined) {
      this._logger.logWithTitle("Contract call", UNRECOGNIZED_CONTRACT_NAME);
      return;
    }

    const func = trace.bytecode.contract.getFunctionFromSelector(
      trace.calldata.slice(0, 4)
    );

    const functionName: string =
      func === undefined
        ? UNRECOGNIZED_FUNCTION_NAME
        : func.type === ContractFunctionType.FALLBACK
        ? FALLBACK_FUNCTION_NAME
        : func.type === ContractFunctionType.RECEIVE
        ? RECEIVE_FUNCTION_NAME
        : func.name;

    this._logger.logWithTitle(
      "Contract call",
      `${trace.bytecode.contract.name}#${functionName}`
    );
  }

  private _logValue(value: BN) {
    if (this._logger === undefined) {
      return;
    }

    this._logger.logWithTitle("Value", weiToHumanReadableString(value));
  }

  private _logError(error: Error) {
    if (this._logger === undefined) {
      return;
    }

    // TODO: We log an empty line here because this is only used when throwing
    //   errors is disabled. The empty line is normally printed by the provider
    //   when an exception is thrown. As we don't throw, we do it here.
    this._logger.log("");
    this._logger.log(util.inspect(error));
  }

  private _logFrom(from: Buffer) {
    if (this._logger === undefined) {
      return;
    }

    this._logger.logWithTitle("From", bufferToHex(from));
  }

  private async _sendTransactionAndReturnHash(tx: Transaction) {
    const {
      trace,
      block,
      blockResult,
      consoleLogMessages,
      error,
    } = await this._node.runTransactionInNewBlock(tx);

    await this._logTransactionTrace(tx, trace, block, blockResult);

    await this._runBuidlerEVMMessageTraceHooks(trace, false);

    this._logConsoleLogMessages(consoleLogMessages);

    if (error !== undefined) {
      if (this._throwOnTransactionFailures) {
        throw error;
      }

      // TODO: This is a little duplicated with the provider, it should be
      //  refactored away
      // TODO: This will log the error, but the RPC method won't be red
      this._logError(error);
    }

    return bufferToRpcData(tx.hash(true));
  }

  private _logTo(trace: MessageTrace, to: Buffer) {
    if (this._logger === undefined) {
      return;
    }

    if (isCreateTrace(trace)) {
      return;
    }

    this._logger.logWithTitle("To", bufferToHex(to));
  }

  private async _runBuidlerEVMMessageTraceHooks(
    trace: MessageTrace,
    isCall: boolean
  ) {
    for (const hook of this._experimentalBuidlerEVMMessageTraceHooks) {
      await hook(trace, isCall);
    }
  }
}
