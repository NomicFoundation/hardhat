import { Block } from "@nomicfoundation/ethereumjs-block";
import {
  bufferToHex,
  toBuffer,
  zeroAddress,
} from "@nomicfoundation/ethereumjs-util";
import {
  OptionalRpcNewBlockTag,
  RpcNewBlockTag,
} from "../../../core/jsonrpc/types/input/blockTag";
import { HardhatNode } from "../node";
import * as BigIntUtils from "../../../util/bigint";
import {
  InvalidArgumentsError,
  InvalidInputError,
} from "../../../core/providers/errors";
import { RpcCallRequest } from "../../../core/jsonrpc/types/input/callRequest";
import { CallParams } from "../node-types";
import { RpcAccessList } from "../../../core/jsonrpc/types/access-list";

/* eslint-disable @nomicfoundation/hardhat-internal-rules/only-hardhat-error */

export class Base {
  constructor(protected readonly _node: HardhatNode) {}

  public async resolveNewBlockTag(
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

  public async rpcCallRequestToNodeCallParams(
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

  protected _rpcAccessListToNodeAccessList(
    rpcAccessList: RpcAccessList
  ): Array<[Buffer, Buffer[]]> {
    return rpcAccessList.map((tuple) => [
      tuple.address,
      tuple.storageKeys ?? [],
    ]);
  }

  protected _checkPostMergeBlockTags(blockTag: "safe" | "finalized") {
    const isPostMerge = this._node.isPostMergeHardfork();
    const hardfork = this._node.hardfork;

    if (!isPostMerge) {
      throw new InvalidArgumentsError(
        `The '${blockTag}' block tag is not allowed in pre-merge hardforks. You are using the '${hardfork}' hardfork.`
      );
    }
  }

  protected _newBlockTagToString(tag: RpcNewBlockTag): string {
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

  private async _getDefaultCallFrom(): Promise<Buffer> {
    const localAccounts = await this._node.getLocalAccountAddresses();

    if (localAccounts.length === 0) {
      return toBuffer(zeroAddress());
    }

    return toBuffer(localAccounts[0]);
  }
}
