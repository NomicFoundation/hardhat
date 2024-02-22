import { Address } from "@nomicfoundation/ethereumjs-util";
import * as t from "io-ts";

import {
  BoundExperimentalHardhatNetworkMessageTraceHook,
  CompilerInput,
  CompilerOutput,
} from "../../../../types";
import {
  bufferToRpcData,
  rpcAddress,
  rpcData,
  rpcHash,
  rpcQuantity,
} from "../../../core/jsonrpc/types/base-types";
import {
  optionalRpcHardhatNetworkConfig,
  RpcHardhatNetworkConfig,
} from "../../../core/jsonrpc/types/input/hardhat-network";
import {
  rpcCompilerInput,
  rpcCompilerOutput,
} from "../../../core/jsonrpc/types/input/solc";
import { validateParams } from "../../../core/jsonrpc/types/input/validation";
import { HardhatMetadata } from "../../../core/jsonrpc/types/output/metadata";
import {
  InvalidInputError,
  MethodNotFoundError,
} from "../../../core/providers/errors";
import { optional } from "../../../util/io-ts";
import { MessageTrace } from "../../stack-traces/message-trace";
import { HardhatNode } from "../node";
import { ForkConfig, MineBlockResult } from "../node-types";

import { ModulesLogger } from "./logger";

/* eslint-disable @nomicfoundation/hardhat-internal-rules/only-hardhat-error */

export class HardhatModule {
  constructor(
    private readonly _node: HardhatNode,
    private readonly _resetCallback: (forkConfig?: ForkConfig) => Promise<void>,
    private readonly _setLoggingEnabledCallback: (
      loggingEnabled: boolean
    ) => void,
    private readonly _logger: ModulesLogger,
    private readonly _experimentalHardhatNetworkMessageTraceHooks: BoundExperimentalHardhatNetworkMessageTraceHook[] = []
  ) {}

  public async processRequest(
    method: string,
    params: any[] = []
  ): Promise<any> {
    switch (method) {
      case "hardhat_getStackTraceFailuresCount":
        return this._getStackTraceFailuresCountAction(
          ...this._getStackTraceFailuresCountParams(params)
        );

      case "hardhat_addCompilationResult":
        return this._addCompilationResultAction(
          ...this._addCompilationResultParams(params)
        );

      case "hardhat_impersonateAccount":
        return this._impersonateAction(...this._impersonateParams(params));

      case "hardhat_intervalMine":
        return this._intervalMineAction(...this._intervalMineParams(params));

      case "hardhat_getAutomine":
        return this._getAutomine();

      case "hardhat_stopImpersonatingAccount":
        return this._stopImpersonatingAction(
          ...this._stopImpersonatingParams(params)
        );

      case "hardhat_reset":
        return this._resetAction(...this._resetParams(params));

      case "hardhat_setLoggingEnabled":
        return this._setLoggingEnabledAction(
          ...this._setLoggingEnabledParams(params)
        );

      case "hardhat_setMinGasPrice":
        return this._setMinGasPriceAction(
          ...this._setMinGasPriceParams(params)
        );

      case "hardhat_dropTransaction":
        return this._dropTransactionAction(
          ...this._dropTransactionParams(params)
        );

      case "hardhat_metadata":
        return this._metadataAction(...this._metadataParams(params));

      case "hardhat_setBalance":
        return this._setBalanceAction(...this._setBalanceParams(params));

      case "hardhat_setCode":
        return this._setCodeAction(...this._setCodeParams(params));

      case "hardhat_setNonce":
        return this._setNonceAction(...this._setNonceParams(params));

      case "hardhat_setStorageAt":
        return this._setStorageAtAction(...this._setStorageAtParams(params));

      case "hardhat_setNextBlockBaseFeePerGas":
        return this._setNextBlockBaseFeePerGasAction(
          ...this._setNextBlockBaseFeePerGasParams(params)
        );

      case "hardhat_setCoinbase":
        return this._setCoinbaseAction(...this._setCoinbaseParams(params));

      case "hardhat_mine":
        return this._hardhatMineAction(...this._hardhatMineParams(params));

      case "hardhat_setPrevRandao":
        return this._hardhatSetPrevRandaoAction(
          ...this._hardhatSetPrevRandaoParams(params)
        );
    }

    throw new MethodNotFoundError(`Method ${method} not found`);
  }

  // hardhat_getStackTraceFailuresCount

  private _getStackTraceFailuresCountParams(params: any[]): [] {
    return validateParams(params);
  }

  private async _getStackTraceFailuresCountAction(): Promise<number> {
    return this._node.getStackTraceFailuresCount();
  }

  // hardhat_addCompilationResult

  private _addCompilationResultParams(
    params: any[]
  ): [string, CompilerInput, CompilerOutput] {
    return validateParams(
      params,
      t.string,
      rpcCompilerInput,
      rpcCompilerOutput
    );
  }

  private async _addCompilationResultAction(
    solcVersion: string,
    compilerInput: CompilerInput,
    compilerOutput: CompilerOutput
  ): Promise<boolean> {
    return this._node.addCompilationResult(
      solcVersion,
      compilerInput,
      compilerOutput
    );
  }

  // hardhat_impersonateAccount

  private _impersonateParams(params: any[]): [Buffer] {
    return validateParams(params, rpcAddress);
  }

  private _impersonateAction(address: Buffer): true {
    return this._node.addImpersonatedAccount(address);
  }

  // hardhat_intervalMine

  private _intervalMineParams(_params: any[]): [] {
    return [];
  }

  private async _intervalMineAction(): Promise<boolean> {
    const result = await this._node.mineBlock();
    const blockNumber = result.block.header.number;

    const isEmpty = result.block.transactions.length === 0;
    if (isEmpty) {
      this._logger.printIntervalMinedBlockNumber(
        blockNumber,
        isEmpty,
        result.block.header.baseFeePerGas
      );
    } else {
      await this._logBlock(result, { isIntervalMined: true });
      this._logger.printIntervalMinedBlockNumber(blockNumber, isEmpty);
      const printedSomething = this._logger.printLogs();
      if (printedSomething) {
        this._logger.printEmptyLine();
      }
    }

    return true;
  }

  // hardhat_getAutomine

  private async _getAutomine(): Promise<boolean> {
    return this._node.getAutomine();
  }

  // hardhat_stopImpersonatingAccount

  private _stopImpersonatingParams(params: any[]): [Buffer] {
    return validateParams(params, rpcAddress);
  }

  private _stopImpersonatingAction(address: Buffer): boolean {
    return this._node.removeImpersonatedAccount(address);
  }

  // hardhat_reset

  private _resetParams(params: any[]): [RpcHardhatNetworkConfig | undefined] {
    return validateParams(params, optionalRpcHardhatNetworkConfig);
  }

  private async _resetAction(
    networkConfig?: RpcHardhatNetworkConfig
  ): Promise<true> {
    await this._resetCallback(networkConfig?.forking);
    return true;
  }

  // hardhat_setLoggingEnabled

  private _setLoggingEnabledParams(params: any[]): [boolean] {
    return validateParams(params, t.boolean);
  }

  private async _setLoggingEnabledAction(
    loggingEnabled: boolean
  ): Promise<true> {
    this._setLoggingEnabledCallback(loggingEnabled);
    return true;
  }

  // hardhat_setMinGasPrice

  private _setMinGasPriceParams(params: any[]): [bigint] {
    return validateParams(params, rpcQuantity);
  }

  private async _setMinGasPriceAction(minGasPrice: bigint): Promise<true> {
    if (minGasPrice < 0n) {
      throw new InvalidInputError("Minimum gas price cannot be negative");
    }

    if (this._node.isEip1559Active()) {
      throw new InvalidInputError(
        "hardhat_setMinGasPrice is not supported when EIP-1559 is active"
      );
    }

    await this._node.setMinGasPrice(minGasPrice);
    return true;
  }

  // hardhat_dropTransaction

  private _dropTransactionParams(params: any[]): [Buffer] {
    return validateParams(params, rpcHash);
  }

  private async _dropTransactionAction(hash: Buffer): Promise<boolean> {
    return this._node.dropTransaction(hash);
  }

  // hardhat_metadata

  private _metadataParams(params: any[]): [] {
    return validateParams(params);
  }

  private async _metadataAction(): Promise<HardhatMetadata> {
    return this._node.getMetadata();
  }

  // hardhat_setBalance

  private _setBalanceParams(params: any[]): [Buffer, bigint] {
    return validateParams(params, rpcAddress, rpcQuantity);
  }

  private async _setBalanceAction(address: Buffer, newBalance: bigint) {
    await this._node.setAccountBalance(new Address(address), newBalance);
    return true;
  }

  // hardhat_setCode

  private _setCodeParams(params: any[]): [Buffer, Buffer] {
    return validateParams(params, rpcAddress, rpcData);
  }

  private async _setCodeAction(address: Buffer, newCode: Buffer) {
    await this._node.setAccountCode(new Address(address), newCode);
    return true;
  }

  // hardhat_setNonce

  private _setNonceParams(params: any[]): [Buffer, bigint] {
    return validateParams(params, rpcAddress, rpcQuantity);
  }

  private async _setNonceAction(address: Buffer, newNonce: bigint) {
    await this._node.setNextConfirmedNonce(new Address(address), newNonce);
    return true;
  }

  // hardhat_setStorageAt

  private _setStorageAtParams(params: any[]): [Buffer, bigint, Buffer] {
    const [address, positionIndex, value] = validateParams(
      params,
      rpcAddress,
      rpcQuantity,
      rpcData
    );

    const MAX_WORD_VALUE = 2n ** 256n;
    if (positionIndex >= MAX_WORD_VALUE) {
      throw new InvalidInputError(
        `Storage key must not be greater than or equal to 2^256. Received ${positionIndex.toString()}.`
      );
    }

    if (value.length !== 32) {
      throw new InvalidInputError(
        `Storage value must be exactly 32 bytes long. Received ${bufferToRpcData(
          value
        )}, which is ${value.length} bytes long.`
      );
    }

    return [address, positionIndex, value];
  }

  private async _setStorageAtAction(
    address: Buffer,
    positionIndex: bigint,
    value: Buffer
  ) {
    await this._node.setStorageAt(new Address(address), positionIndex, value);
    return true;
  }

  // hardhat_setNextBlockBaseFeePerGas
  private _setNextBlockBaseFeePerGasParams(params: any[]): [bigint] {
    return validateParams(params, rpcQuantity);
  }

  private _setNextBlockBaseFeePerGasAction(baseFeePerGas: bigint) {
    if (!this._node.isEip1559Active()) {
      throw new InvalidInputError(
        "hardhat_setNextBlockBaseFeePerGas is disabled because EIP-1559 is not active"
      );
    }

    this._node.setUserProvidedNextBlockBaseFeePerGas(baseFeePerGas);
    return true;
  }

  // hardhat_setCoinbase

  private _setCoinbaseParams(params: any[]): [Buffer] {
    return validateParams(params, rpcAddress);
  }

  private async _setCoinbaseAction(address: Buffer) {
    await this._node.setCoinbase(new Address(address));
    return true;
  }

  // hardhat_mine
  private async _hardhatMineAction(blockCount?: bigint, interval?: bigint) {
    const mineBlockResults = await this._node.mineBlocks(blockCount, interval);

    for (const [i, result] of mineBlockResults.entries()) {
      await this._logHardhatMinedBlock(result);

      // print an empty line after logging blocks with txs,
      // unless it's the last logged block
      const isEmpty = result.block.transactions.length === 0;
      if (!isEmpty && i + 1 < mineBlockResults.length) {
        this._logger.logEmptyLine();
      }
    }

    return true;
  }
  private _hardhatMineParams(
    params: any[]
  ): [bigint | undefined, bigint | undefined] {
    return validateParams(params, optional(rpcQuantity), optional(rpcQuantity));
  }

  // hardhat_setPrevRandao

  private _hardhatSetPrevRandaoParams(params: any[]): [Buffer] {
    // using rpcHash because it's also 32 bytes long
    return validateParams(params, rpcHash);
  }

  private async _hardhatSetPrevRandaoAction(prevRandao: Buffer) {
    if (!this._node.isPostMergeHardfork()) {
      throw new InvalidInputError(
        `hardhat_setPrevRandao is only available in post-merge hardforks, the current hardfork is ${this._node.hardfork}`
      );
    }

    this._node.setPrevRandao(prevRandao);

    return true;
  }

  private async _logBlock(
    result: MineBlockResult,
    { isIntervalMined }: { isIntervalMined: boolean }
  ) {
    const { block, traces } = result;

    const codes: Buffer[] = [];
    for (const txTrace of traces) {
      const code = await this._node.getCodeFromTrace(
        txTrace.trace,
        block.header.number
      );

      codes.push(code);
    }

    if (isIntervalMined) {
      this._logger.logIntervalMinedBlock(result, codes);
    } else {
      this._logger.logMinedBlock(result, codes);
    }

    for (const txTrace of traces) {
      await this._runHardhatNetworkMessageTraceHooks(txTrace.trace, false);
    }
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

  private async _logHardhatMinedBlock(result: MineBlockResult) {
    const isEmpty = result.block.transactions.length === 0;
    const blockNumber = result.block.header.number;

    if (isEmpty) {
      this._logger.logEmptyHardhatMinedBlock(
        blockNumber,
        result.block.header.baseFeePerGas
      );
    } else {
      await this._logBlock(result, { isIntervalMined: false });
    }
  }
}
