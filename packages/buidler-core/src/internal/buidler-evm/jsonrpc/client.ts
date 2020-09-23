import { BN, bufferToHex } from "ethereumjs-util";
import * as t from "io-ts";

import { HttpProvider } from "../../core/providers/http";
import { BlockTag, rpcData, rpcQuantity } from "../provider/input";

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
    // This is an ad-hoc optimization, devised by manually observing multiple
    // execution traces, and noticing that most of the time a call to `getCode`
    // is followed by one to `getAccountData`.
    const data = await this.getAccountData(address, blockTag);
    return data.code;
  }

  public async getAccountData(
    address: Buffer,
    blockTag: BlockTag
  ): Promise<{ code: Buffer; transactionCount: BN; balance: BN }> {
    const results = await this._performBatch(
      {
        method: "eth_getCode",
        params: [bufferToHex(address), blockTagToString(blockTag)],
        tType: rpcData,
      },
      {
        method: "eth_getTransactionCount",
        params: [bufferToHex(address), blockTagToString(blockTag)],
        tType: rpcQuantity,
      },
      {
        method: "eth_getBalance",
        params: [bufferToHex(address), blockTagToString(blockTag)],
        tType: rpcQuantity,
      }
    );

    return {
      code: results[0],
      transactionCount: results[1],
      balance: results[2],
    };
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
    const key = this._getCacheKey(method, params);
    if (this._cache.has(key)) {
      return this._cache.get(key);
    }

    const result = await this._send(method, params);
    const decoded = decode(result, tType);
    this._cache.set(key, decoded);
    return decoded;
  }

  private _getCacheKey(method: string, params: any[]) {
    return `${method} ${JSON.stringify(params)}`;
  }

  private async _performBatch(
    ...batch: Array<{ method: string; params: any[]; tType: t.Type<any> }>
  ): Promise<any[]> {
    const responses = [];
    const missingResponseIndexes = [];

    for (let i = 0; i < batch.length; i++) {
      const entry = batch[i];
      const key = this._getCacheKey(entry.method, entry.params);

      if (this._cache.has(key)) {
        responses.push(this._cache.get(key));
      } else {
        responses.push(undefined);
        missingResponseIndexes.push(i);
      }
    }

    if (missingResponseIndexes.length === 0) {
      return responses;
    }

    const results = await this._sendBatch(
      missingResponseIndexes.map((i) => ({
        method: batch[i].method,
        params: batch[i].params,
      }))
    );

    for (let resultIndex = 0; resultIndex < results.length; resultIndex++) {
      const responseIndex = missingResponseIndexes[resultIndex];
      const decoded = decode(results[resultIndex], batch[responseIndex].tType);

      responses[responseIndex] = decoded;

      const cacheKey = this._getCacheKey(
        batch[responseIndex].method,
        batch[responseIndex].params
      );
      this._cache.set(cacheKey, decoded);
    }

    return responses;
  }

  private async _send(
    method: string,
    params: any[],
    isRetryCall = false
  ): Promise<any> {
    try {
      return await this._httpProvider.request({ method, params });
    } catch (err) {
      if (this._shouldRetry(isRetryCall, err)) {
        return this._send(method, params, true);
      }
      // tslint:disable-next-line only-buidler-error
      throw err;
    }
  }

  private async _sendBatch(
    batch: Array<{ method: string; params: any[] }>,
    isRetryCall = false
  ): Promise<any[]> {
    try {
      return await this._httpProvider.sendBatch(batch);
    } catch (err) {
      if (this._shouldRetry(isRetryCall, err)) {
        return this._sendBatch(batch, true);
      }
      // tslint:disable-next-line only-buidler-error
      throw err;
    }
  }

  private _shouldRetry(isRetryCall: boolean, err: any) {
    console.log(this._httpProvider.url);
    if (err instanceof Error && err.message === undefined) {
      console.log({ err });
    }
    return (
      !isRetryCall &&
      this._httpProvider.url.includes("infura") &&
      err instanceof Error &&
      err.message.includes("header not found")
    );
  }
}

function blockTagToString(blockTag: BlockTag) {
  return BN.isBN(blockTag) ? `0x${blockTag.toString("hex")}` : blockTag;
}
