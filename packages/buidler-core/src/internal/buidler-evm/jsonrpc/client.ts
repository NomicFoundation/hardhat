import { BN } from "ethereumjs-util";

import { HttpProvider } from "../../core/providers/http";
import { rpcData, rpcQuantity } from "../provider/input";

import {
  decode,
  RpcBlock,
  rpcBlock,
  rpcBlockWithTransactions,
  RpcBlockWithTransactions,
} from "./types";

// TODO: is there really no existing definition?
export type BlockTag = BN | "latest" | "pending" | "earliest";

export class JsonRpcClient {
  public static forUrl(url: string) {
    return new JsonRpcClient(new HttpProvider(url, "external network"));
  }

  constructor(private _httpProvider: HttpProvider) {}

  public async getLatestBlockNumber(): Promise<BN> {
    const result = await this._httpProvider.send("eth_blockNumber", []);
    return decode(result, rpcQuantity);
  }

  public async getBlockByNumber(
    blockTag: BlockTag,
    includeTransactions = false
  ): Promise<RpcBlock | RpcBlockWithTransactions> {
    const result = await this._httpProvider.send("eth_getBlockByNumber", [
      blockTagToString(blockTag),
      includeTransactions,
    ]);
    if (includeTransactions) {
      return decode(result, rpcBlockWithTransactions);
    }
    return decode(result, rpcBlock);
  }

  public async getCode(address: Buffer, blockTag: BlockTag): Promise<Buffer> {
    const result = await this._httpProvider.send("eth_getCode", [
      bufferToString(address),
      blockTagToString(blockTag),
    ]);
    return decode(result, rpcData);
  }

  public async getStorageAt(
    address: Buffer,
    position: Buffer,
    blockTag: BlockTag
  ): Promise<Buffer> {
    const result = await this._httpProvider.send("eth_getStorageAt", [
      bufferToString(address),
      bufferToString(position),
      blockTagToString(blockTag),
    ]);
    return decode(result, rpcData);
  }
}

function bufferToString(buffer: Buffer) {
  return `0x${buffer.toString("hex")}`;
}

function blockTagToString(blockTag: BlockTag) {
  return BN.isBN(blockTag) ? `0x${blockTag.toString("hex")}` : blockTag;
}
