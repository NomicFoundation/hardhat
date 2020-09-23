import { BN, bufferToHex } from "ethereumjs-util";
import * as t from "io-ts";

import { BlockTag, rpcData, rpcQuantity } from "../provider/input";

import { JsonRpcRequestBatcher, JsonRpcSender } from "./batch";
import { BatchHttpRequestService } from "./http";
import {
  decode,
  nullable,
  RpcBlock,
  rpcBlock,
  rpcBlockWithTransactions,
  RpcBlockWithTransactions,
  rpcLog,
  rpcTransaction,
  rpcTransactionReceipt,
} from "./types";

export class JsonRpcClient {
  public static forUrl(url: string) {
    const service = new BatchHttpRequestService(url);
    const batcher = new JsonRpcRequestBatcher(service);
    return new JsonRpcClient(batcher, url);
  }

  private _cache: Map<string, any> = new Map();

  constructor(private _sender: JsonRpcSender, private _url = "") {}

  public async getLatestBlockNumber(): Promise<BN> {
    return this._perform("eth_blockNumber", [], rpcQuantity);
  }

  public async getNetworkId(): Promise<string> {
    return this._perform("net_version", [], t.string);
  }

  public async getBalance(address: Buffer, blockTag: BlockTag): Promise<BN> {
    return this._perform(
      "eth_getBalance",
      [bufferToHex(address), blockTagToString(blockTag)],
      rpcQuantity
    );
  }

  public async getBlockByNumber(
    blockTag: BlockTag,
    includeTransactions?: false
  ): Promise<RpcBlock | null>;

  public async getBlockByNumber(
    blockTag: BlockTag,
    includeTransactions: true
  ): Promise<RpcBlockWithTransactions | null>;

  public async getBlockByNumber(
    blockTag: BlockTag,
    includeTransactions = false
  ): Promise<RpcBlock | RpcBlockWithTransactions | null> {
    if (includeTransactions) {
      return this._perform(
        "eth_getBlockByNumber",
        [blockTagToString(blockTag), includeTransactions],
        nullable(rpcBlockWithTransactions)
      );
    }
    return this._perform(
      "eth_getBlockByNumber",
      [blockTagToString(blockTag), includeTransactions],
      nullable(rpcBlock)
    );
  }

  public async getBlockByHash(
    blockHash: Buffer,
    includeTransactions?: false
  ): Promise<RpcBlock | null>;

  public async getBlockByHash(
    blockHash: Buffer,
    includeTransactions: true
  ): Promise<RpcBlockWithTransactions | null>;

  public async getBlockByHash(
    blockHash: Buffer,
    includeTransactions = false
  ): Promise<RpcBlock | RpcBlockWithTransactions | null> {
    if (includeTransactions) {
      return this._perform(
        "eth_getBlockByHash",
        [bufferToHex(blockHash), includeTransactions],
        nullable(rpcBlockWithTransactions)
      );
    }
    return this._perform(
      "eth_getBlockByHash",
      [bufferToHex(blockHash), includeTransactions],
      nullable(rpcBlock)
    );
  }

  public async getCode(address: Buffer, blockTag: BlockTag): Promise<Buffer> {
    return this._perform(
      "eth_getCode",
      [bufferToHex(address), blockTagToString(blockTag)],
      rpcData
    );
  }

  public async getStorageAt(
    address: Buffer,
    position: Buffer,
    blockTag: BlockTag
  ): Promise<Buffer> {
    return this._perform(
      "eth_getStorageAt",
      [bufferToHex(address), bufferToHex(position), blockTagToString(blockTag)],
      rpcData
    );
  }

  public async getTransactionCount(address: Buffer, blockTag: BlockTag) {
    return this._perform(
      "eth_getTransactionCount",
      [bufferToHex(address), blockTagToString(blockTag)],
      rpcQuantity
    );
  }

  public async getTransactionByHash(transactionHash: Buffer) {
    return this._perform(
      "eth_getTransactionByHash",
      [bufferToHex(transactionHash)],
      nullable(rpcTransaction)
    );
  }

  public async getTransactionReceipt(transactionHash: Buffer) {
    return this._perform(
      "eth_getTransactionReceipt",
      [bufferToHex(transactionHash)],
      nullable(rpcTransactionReceipt)
    );
  }

  public async getLogs(options: {
    fromBlock: BlockTag;
    toBlock: BlockTag;
    address?: Buffer | Buffer[];
    topics?: Array<Array<Buffer | null> | null>;
  }) {
    let address: string | string[] | undefined;
    if (options.address !== undefined) {
      address = Array.isArray(options.address)
        ? options.address.map((x) => bufferToHex(x))
        : bufferToHex(options.address);
    }
    let topics: Array<Array<string | null> | null> | undefined;
    if (options.topics !== undefined) {
      topics = options.topics.map((items) =>
        items !== null
          ? items.map((x) => (x !== null ? bufferToHex(x) : x))
          : null
      );
    }

    return this._perform(
      "eth_getLogs",
      [
        {
          fromBlock: blockTagToString(options.fromBlock),
          toBlock: blockTagToString(options.toBlock),
          address,
          topics,
        },
      ],
      t.array(rpcLog, "RpcLog Array")
    );
  }

  private async _perform<T>(
    method: string,
    params: any[],
    tType: t.Type<T>
  ): Promise<T> {
    const key = `${method} ${JSON.stringify(params)}`;
    if (this._cache.has(key)) {
      return this._cache.get(key);
    }
    const result = await this._send(method, params);
    const decoded = decode(result, tType);
    this._cache.set(key, decoded);
    return decoded;
  }

  private async _send(
    method: string,
    params: any[],
    isRetryCall = false
  ): Promise<any> {
    try {
      return await this._sender.send(method, params);
    } catch (err) {
      if (
        !isRetryCall &&
        this._url.includes("infura") &&
        err instanceof Error &&
        err.message.includes("header not found")
      ) {
        return this._send(method, params, true);
      }
      // tslint:disable-next-line only-buidler-error
      throw err;
    }
  }
}

function blockTagToString(blockTag: BlockTag) {
  return BN.isBN(blockTag) ? `0x${blockTag.toString("hex")}` : blockTag;
}
