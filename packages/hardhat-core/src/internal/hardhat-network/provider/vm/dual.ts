import type { Message } from "@nomicfoundation/ethereumjs-evm";
import type { RunTxResult } from "@nomicfoundation/ethereumjs-vm";
import { Block } from "@nomicfoundation/ethereumjs-block";
import { Common } from "@nomicfoundation/ethereumjs-common";
import { TypedTransaction } from "@nomicfoundation/ethereumjs-tx";
import { Account, Address } from "@nomicfoundation/ethereumjs-util";

import { assertHardhatInvariant } from "../../../core/errors";
import { RpcDebugTracingConfig } from "../../../core/jsonrpc/types/input/debugTraceTransaction";
import { NodeConfig } from "../node-types";
import { RpcDebugTraceOutput } from "../output";
import { HardhatBlockchainInterface } from "../types/HardhatBlockchainInterface";

import { EthereumJSAdapter } from "./ethereumjs";
import { RethnetAdapter } from "./rethnet";
import { VMAdapter } from "./vm-adapter";

/* eslint-disable @nomiclabs/hardhat-internal-rules/only-hardhat-error */
/* eslint-disable @typescript-eslint/restrict-template-expressions */

export class DualModeAdapter implements VMAdapter {
  constructor(
    private _ethereumJSAdapter: VMAdapter,
    private _rethnetAdapter: VMAdapter
  ) {}

  public static async create(
    common: Common,
    blockchain: HardhatBlockchainInterface,
    config: NodeConfig,
    selectHardfork: (blockNumber: bigint) => string
  ) {
    const ethereumJSAdapter = await EthereumJSAdapter.create(
      common,
      blockchain,
      config,
      selectHardfork
    );

    const rethnetAdapter = await RethnetAdapter.create(
      // eslint-disable-next-line @typescript-eslint/dot-notation
      ethereumJSAdapter["_stateManager"],
      config,
      selectHardfork,
      async (blockNumber) => {
        const block = await blockchain.getBlock(blockNumber);
        assertHardhatInvariant(
          block !== undefined && block !== null,
          "Should be able to get block"
        );

        return block.header.hash();
      }
    );

    return new DualModeAdapter(ethereumJSAdapter, rethnetAdapter);
  }

  public async dryRun(
    tx: TypedTransaction,
    blockContext: Block,
    forceBaseFeeZero?: boolean
  ): Promise<RunTxResult> {
    const ethereumJSResult = await this._ethereumJSAdapter.dryRun(
      tx,
      blockContext,
      forceBaseFeeZero
    );

    const rethnetResult = await this._rethnetAdapter.dryRun(
      tx,
      blockContext,
      forceBaseFeeZero
    );

    assertEqualRunTxResults(ethereumJSResult, rethnetResult);

    return rethnetResult;
  }

  public async getStateRoot(): Promise<Buffer> {
    return this._ethereumJSAdapter.getStateRoot();
  }

  public async getAccount(address: Address): Promise<Account> {
    return this._ethereumJSAdapter.getAccount(address);
  }

  public async getContractStorage(
    address: Address,
    key: Buffer
  ): Promise<Buffer> {
    return this._ethereumJSAdapter.getContractStorage(address, key);
  }

  public async getContractCode(address: Address): Promise<Buffer> {
    return this._ethereumJSAdapter.getContractCode(address);
  }

  public async putAccount(address: Address, account: Account): Promise<void> {
    return this._ethereumJSAdapter.putAccount(address, account);
  }

  public async putContractCode(address: Address, value: Buffer): Promise<void> {
    return this._ethereumJSAdapter.putContractCode(address, value);
  }

  public async putContractStorage(
    address: Address,
    key: Buffer,
    value: Buffer
  ): Promise<void> {
    return this._ethereumJSAdapter.putContractStorage(address, key, value);
  }

  public async restoreContext(stateRoot: Buffer): Promise<void> {
    return this._ethereumJSAdapter.restoreContext(stateRoot);
  }

  public async traceTransaction(
    hash: Buffer,
    block: Block,
    config: RpcDebugTracingConfig
  ): Promise<RpcDebugTraceOutput> {
    return this._ethereumJSAdapter.traceTransaction(hash, block, config);
  }

  public enableTracing(callbacks: {
    beforeMessage: (message: Message, next: any) => Promise<void>;
    step: () => Promise<void>;
    afterMessage: () => Promise<void>;
  }): void {
    return this._ethereumJSAdapter.enableTracing(callbacks);
  }

  public disableTracing(): void {
    return this._ethereumJSAdapter.disableTracing();
  }

  public async setBlockContext(
    block: Block,
    irregularStateOrUndefined: Buffer | undefined
  ): Promise<void> {
    return this._ethereumJSAdapter.setBlockContext(
      block,
      irregularStateOrUndefined
    );
  }

  public async startBlock(): Promise<void> {
    return this._ethereumJSAdapter.startBlock();
  }

  public async runTxInBlock(
    tx: TypedTransaction,
    block: Block
  ): Promise<RunTxResult> {
    return this._ethereumJSAdapter.runTxInBlock(tx, block);
  }

  public async addBlockRewards(
    rewards: Array<[Address, bigint]>
  ): Promise<void> {
    return this._ethereumJSAdapter.addBlockRewards(rewards);
  }

  public async sealBlock(): Promise<void> {
    return this._ethereumJSAdapter.sealBlock();
  }

  public async revertBlock(): Promise<void> {
    return this._ethereumJSAdapter.revertBlock();
  }
}

function assertEqualRunTxResults(
  ethereumJSResult: RunTxResult,
  rethnetResult: RunTxResult
) {
  if (ethereumJSResult.totalGasSpent !== rethnetResult.totalGasSpent) {
    console.trace(
      `Different totalGasSpent: ${ethereumJSResult.totalGasSpent} !== ${rethnetResult.totalGasSpent}`
    );
    throw new Error("Different totalGasSpent");
  }
  if (ethereumJSResult.gasRefund !== rethnetResult.gasRefund) {
    console.trace(
      `Different gasRefund: ${ethereumJSResult.gasRefund} !== ${rethnetResult.gasRefund}`
    );
    throw new Error("Different gasRefund");
  }
  if (
    ethereumJSResult.createdAddress?.toString() !==
    rethnetResult.createdAddress?.toString()
  ) {
    console.trace(
      `Different createdAddress: ${ethereumJSResult.createdAddress?.toString()} !== ${rethnetResult.createdAddress?.toString()}`
    );
    throw new Error("Different createdAddress");
  }

  if (
    ethereumJSResult.execResult.exceptionError?.error !==
    rethnetResult.execResult.exceptionError?.error
  ) {
    console.trace(
      `Different exceptionError.error: ${ethereumJSResult.execResult.exceptionError?.error} !== ${rethnetResult.execResult.exceptionError?.error}`
    );
    throw new Error("Different exceptionError.error");
  }

  if (
    ethereumJSResult.execResult.exceptionError?.errorType !==
    rethnetResult.execResult.exceptionError?.errorType
  ) {
    console.trace(
      `Different exceptionError.errorType: ${ethereumJSResult.execResult.exceptionError?.errorType} !== ${rethnetResult.execResult.exceptionError?.errorType}`
    );
    throw new Error("Different exceptionError.errorType");
  }

  // TODO: we only compare the return values when a contract was *not* created,
  // because sometimes ethereumjs has the created bytecode in the return value
  // and rethnet doesn't
  if (ethereumJSResult.createdAddress === undefined) {
    if (
      ethereumJSResult.execResult.returnValue.toString("hex") !==
      rethnetResult.execResult.returnValue.toString("hex")
    ) {
      console.trace(
        `Different returnValue: ${ethereumJSResult.execResult.returnValue.toString(
          "hex"
        )} !== ${rethnetResult.execResult.returnValue.toString("hex")}`
      );
      throw new Error("Different returnValue");
    }
  }
}
