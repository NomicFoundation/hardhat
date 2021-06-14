import { Address, BN } from "ethereumjs-util";
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
import {
  InvalidInputError,
  MethodNotFoundError,
} from "../../../core/providers/errors";
import { MessageTrace } from "../../stack-traces/message-trace";
import { HardhatNode } from "../node";
import { ForkConfig, MineBlockResult } from "../node-types";

import { ModulesLogger } from "./logger";

// tslint:disable only-hardhat-error

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

      case "hardhat_setBalance":
        return this._setBalanceAction(...this._setBalanceParams(params));

      case "hardhat_setCode":
        return this._setCodeAction(...this._setCodeParams(params));

      case "hardhat_setNonce":
        return this._setNonceAction(...this._setNonceParams(params));

      case "hardhat_setStorageAt":
        return this._setStorageAtAction(...this._setStorageAtParams(params));
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

  private _intervalMineParams(params: any[]): [] {
    return [];
  }

  private async _intervalMineAction(): Promise<boolean> {
    const result = await this._node.mineBlock();
    const blockNumber = result.block.header.number.toNumber();

    const isEmpty = result.block.transactions.length === 0;
    if (isEmpty) {
      this._logger.printMinedBlockNumber(blockNumber, isEmpty);
    } else {
      await this._logBlock(result);
      this._logger.printMinedBlockNumber(blockNumber, isEmpty);
      const printedSomething = this._logger.printLogs();
      if (printedSomething) {
        this._logger.printEmptyLine();
      }
    }

    return true;
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

  private _setMinGasPriceParams(params: any[]): [BN] {
    return validateParams(params, rpcQuantity);
  }

  private async _setMinGasPriceAction(minGasPrice: BN): Promise<true> {
    if (minGasPrice.lt(new BN(0))) {
      throw new InvalidInputError("Minimum gas price cannot be negative");
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

  // hardhat_setBalance

  private _setBalanceParams(params: any[]): [Buffer, BN] {
    return validateParams(params, rpcAddress, rpcQuantity);
  }

  private async _setBalanceAction(address: Buffer, newBalance: BN) {
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

  private _setNonceParams(params: any[]): [Buffer, BN] {
    return validateParams(params, rpcAddress, rpcQuantity);
  }

  private async _setNonceAction(address: Buffer, newNonce: BN) {
    await this._node.setNextConfirmedNonce(new Address(address), newNonce);
    return true;
  }

  // hardhat_setStorageAt

  private _setStorageAtParams(params: any[]): [Buffer, BN, Buffer] {
    const [address, positionIndex, value] = validateParams(
      params,
      rpcAddress,
      rpcQuantity,
      rpcData
    );

    const MAX_WORD_VALUE = new BN(2).pow(new BN(256));
    if (positionIndex.gte(MAX_WORD_VALUE)) {
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
    positionIndex: BN,
    value: Buffer
  ) {
    await this._node.setStorageAt(new Address(address), positionIndex, value);
    return true;
  }

  private async _logBlock(result: MineBlockResult) {
    const { block, traces } = result;

    const codes: Buffer[] = [];
    for (const txTrace of traces) {
      const code = await this._node.getCodeFromTrace(
        txTrace.trace,
        new BN(block.header.number)
      );

      codes.push(code);
    }

    this._logger.logIntervalMinedBlock(result, codes);

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
}
