import { BN, bufferToHex } from "ethereumjs-util";
import * as t from "io-ts";

import { HttpProvider } from "../../core/providers/http";
import { rpcData, rpcQuantity } from "../provider/input";

import {
  decode,
  nullable,
  RpcBlock,
  rpcBlock,
  rpcBlockWithTransactions,
  RpcBlockWithTransactions,
  rpcTransaction,
  rpcTransactionReceipt,
} from "./types";

// TODO: is there really no existing definition?
export type BlockTag = BN | "latest" | "pending" | "earliest";

export class JsonRpcClient {
  public static forUrl(url: string) {
    return new JsonRpcClient(new HttpProvider(url, "external network"));
  }

  private _cache: Map<string, any> = new Map();

  constructor(private _httpProvider: HttpProvider) {}

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

  private async _perform<T>(
    method: string,
    params: Array<string | number | boolean>,
    tType: t.Type<T, T>
  ): Promise<T> {
    const key = `${method} ${params.join(" ")}`;
    if (this._cache.has(key)) {
      return this._cache.get(key);
    }
    const result = await this._httpProvider.send(method, params);
    const decoded = decode(result, tType);
    this._cache.set(key, decoded);
    return decoded;
  }
}

function blockTagToString(blockTag: BlockTag) {
  return BN.isBN(blockTag) ? `0x${blockTag.toString("hex")}` : blockTag;
}
