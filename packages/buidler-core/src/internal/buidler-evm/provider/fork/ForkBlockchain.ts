import Common from "ethereumjs-common";
import { BN } from "ethereumjs-util";
import { callbackify } from "util";

import { JsonRpcClient } from "../../jsonrpc/client";
import { Block } from "../Block";
import { BlockchainInterface } from "../BlockchainInterface";

import { rpcToBlockData } from "./rpcToBlockData";

// TODO: figure out what errors we wanna throw
/* tslint:disable only-buidler-error */

export class ForkBlockchain {
  constructor(
    private _jsonRpcClient: JsonRpcClient,
    private _forkBlockNumber: BN,
    private _common: Common
  ) {}

  public async getBlock(
    blockHashOrNumber: Buffer | number | BN
  ): Promise<Block | undefined> {
    if (!BN.isBN(blockHashOrNumber)) {
      throw new Error("not implemented");
    }
    const rpcBlock = await this._jsonRpcClient.getBlockByNumber(
      blockHashOrNumber,
      true
    );
    return new Block(rpcToBlockData(rpcBlock), { common: this._common });
  }

  public async getLatestBlock(): Promise<Block> {
    throw new Error("not implemented");
  }

  public async putBlock(block: Block): Promise<Block> {
    throw new Error("not implemented");
  }

  public async delBlock(blockHash: Buffer): Promise<void> {
    throw new Error("not implemented");
  }

  public async getDetails(_: string): Promise<void> {
    throw new Error("not implemented");
  }

  public async iterator(name: string, onBlock: any): Promise<void> {
    throw new Error("not implemented");
  }

  public deleteAllFollowingBlocks(block: Block): void {
    throw new Error("not implemented");
  }

  public asBlockchain(): BlockchainInterface {
    return {
      getBlock: callbackify(this.getBlock.bind(this)),
      getLatestBlock: callbackify(this.getLatestBlock.bind(this)),
      putBlock: callbackify(this.putBlock.bind(this)),
      delBlock: callbackify(this.delBlock.bind(this)),
      getDetails: callbackify(this.getDetails.bind(this)),
      iterator: callbackify(this.iterator.bind(this)),
      deleteAllFollowingBlocks: this.deleteAllFollowingBlocks.bind(this),
    };
  }
}
