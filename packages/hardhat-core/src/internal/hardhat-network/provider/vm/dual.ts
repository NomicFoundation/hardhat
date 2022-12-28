import { Block } from "@nomicfoundation/ethereumjs-block";
import { Common } from "@nomicfoundation/ethereumjs-common";
import { Log } from "@nomicfoundation/ethereumjs-evm";
import { TypedTransaction } from "@nomicfoundation/ethereumjs-tx";
import {
  Account,
  Address,
  bufferToHex,
} from "@nomicfoundation/ethereumjs-util";
import { TracingMessage, TracingMessageResult, TracingStep } from "rethnet-evm";

import { assertHardhatInvariant } from "../../../core/errors";
import { RpcDebugTracingConfig } from "../../../core/jsonrpc/types/input/debugTraceTransaction";
import { NodeConfig } from "../node-types";
import { RpcDebugTraceOutput } from "../output";
import { HardhatBlockchainInterface } from "../types/HardhatBlockchainInterface";

import { EthereumJSAdapter } from "./ethereumjs";
import { RethnetAdapter } from "./rethnet";
import { RunTxResult, Trace, TracingCallbacks, VMAdapter } from "./vm-adapter";

/* eslint-disable @nomiclabs/hardhat-internal-rules/only-hardhat-error */
/* eslint-disable @typescript-eslint/restrict-template-expressions */

function printEthereumJSTrace(trace: any) {
  console.log(JSON.stringify(trace, null, 2));
}

function printRethnetTrace(trace: any) {
  console.log(
    JSON.stringify(
      trace,
      (key, value) => (typeof value === "bigint" ? value.toString() : value),
      2
    )
  );
}

export class DualModeAdapter implements VMAdapter {
  private _tracingCallbacks: TracingCallbacks | undefined;

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
      config,
      selectHardfork,
      async (blockNumber) => {
        const block = await blockchain.getBlock(blockNumber);
        assertHardhatInvariant(block !== null, "Should be able to get block");

        return block.header.hash();
      }
    );

    return new DualModeAdapter(ethereumJSAdapter, rethnetAdapter);
  }

  public async dryRun(
    tx: TypedTransaction,
    blockContext: Block,
    forceBaseFeeZero?: boolean
  ): Promise<[RunTxResult, Trace]> {
    const ethereumJSResultPromise = this._ethereumJSAdapter.dryRun(
      tx,
      blockContext,
      forceBaseFeeZero
    );

    const rethnetResultPromise = this._rethnetAdapter.dryRun(
      tx,
      blockContext,
      forceBaseFeeZero
    );

    const [[ethereumJSResult, ethereumJSTrace], [rethnetResult, rethnetTrace]] =
      await Promise.all([ethereumJSResultPromise, rethnetResultPromise]);

    try {
      assertEqualRunTxResults(ethereumJSResult, rethnetResult);
      return [rethnetResult, rethnetTrace];
    } catch (e) {
      // if the results didn't match, print the traces
      console.log("EthereumJS trace");
      printEthereumJSTrace(ethereumJSTrace);
      console.log();
      console.log("Rethnet trace");
      printRethnetTrace(rethnetTrace);

      throw e;
    }
  }

  public async getStateRoot(): Promise<Buffer> {
    const ethereumJSRoot = await this._ethereumJSAdapter.getStateRoot();
    const rethnetRoot = await this._rethnetAdapter.getStateRoot();

    if (!ethereumJSRoot.equals(rethnetRoot)) {
      console.trace(
        `Different state root: ${ethereumJSRoot.toString(
          "hex"
        )} !== ${rethnetRoot.toString("hex")}`
      );
      throw new Error("Different state root");
    }

    return rethnetRoot;
  }

  public async getAccount(address: Address): Promise<Account> {
    const ethereumJSAccount = await this._ethereumJSAdapter.getAccount(address);
    const rethnetAccount = await this._rethnetAdapter.getAccount(address);

    assertEqualAccounts(address, ethereumJSAccount, rethnetAccount);

    return ethereumJSAccount;
  }

  public async getContractStorage(
    address: Address,
    key: Buffer
  ): Promise<Buffer> {
    const ethereumJSStorageSlot =
      await this._ethereumJSAdapter.getContractStorage(address, key);

    const rethnetStorageSlot = await this._rethnetAdapter.getContractStorage(
      address,
      key
    );

    if (!ethereumJSStorageSlot.equals(rethnetStorageSlot)) {
      // we only throw if any of the returned values was non-empty, but
      // ethereumjs and rethnet return different values when that happens
      if (
        ethereumJSStorageSlot.length !== 0 ||
        !rethnetStorageSlot.equals(Buffer.from([0x00]))
      ) {
        console.trace(
          `Different storage slot: ${bufferToHex(
            ethereumJSStorageSlot
          )} !== ${bufferToHex(rethnetStorageSlot)}`
        );
        throw new Error("Different storage slot");
      }
    }

    return rethnetStorageSlot;
  }

  public async getContractCode(
    address: Address,
    ethJsOnly?: boolean
  ): Promise<Buffer> {
    const ethereumJSCode = await this._ethereumJSAdapter.getContractCode(
      address
    );

    if (ethJsOnly === true) {
      return ethereumJSCode;
    }

    const rethnetCode = await this._rethnetAdapter.getContractCode(address);

    if (!ethereumJSCode.equals(rethnetCode)) {
      console.trace(
        `Different contract code: ${ethereumJSCode.toString(
          "hex"
        )} !== ${rethnetCode.toString("hex")}`
      );
      throw new Error("Different contract code");
    }

    return rethnetCode;
  }

  public async putAccount(address: Address, account: Account): Promise<void> {
    await this._ethereumJSAdapter.putAccount(address, account);
    await this._rethnetAdapter.putAccount(address, account);
  }

  public async putContractCode(address: Address, value: Buffer): Promise<void> {
    await this._ethereumJSAdapter.putContractCode(address, value);
    await this._rethnetAdapter.putContractCode(address, value);
  }

  public async putContractStorage(
    address: Address,
    key: Buffer,
    value: Buffer
  ): Promise<void> {
    await this._ethereumJSAdapter.putContractStorage(address, key, value);
    await this._rethnetAdapter.putContractStorage(address, key, value);
  }

  public async restoreContext(stateRoot: Buffer): Promise<void> {
    await this._ethereumJSAdapter.restoreContext(stateRoot);
    await this._rethnetAdapter.restoreContext(stateRoot);
  }

  public async traceTransaction(
    hash: Buffer,
    block: Block,
    config: RpcDebugTracingConfig
  ): Promise<RpcDebugTraceOutput> {
    return this._ethereumJSAdapter.traceTransaction(hash, block, config);
  }

  public enableTracing(callbacks: TracingCallbacks): void {
    this._tracingCallbacks = callbacks;

    this._ethereumJSAdapter.enableTracing({
      beforeMessage: this._ethereumJSBeforeMessagehandler,
      step: this._ethereumJSStepHandler,
      afterMessage: this._ethereumJSAfterMessageHandler,
    });

    this._rethnetAdapter.enableTracing({
      beforeMessage: this._rethnetBeforeMessagehandler,
      step: this._rethnetStepHandler,
      afterMessage: this._rethnetAfterMessageHandler,
    });
  }

  public disableTracing(): void {
    this._tracingCallbacks = undefined;

    this._ethereumJSAdapter.disableTracing();
    this._rethnetAdapter.disableTracing();
  }

  public async setBlockContext(
    block: Block,
    irregularStateOrUndefined: Buffer | undefined
  ): Promise<void> {
    await this._ethereumJSAdapter.setBlockContext(
      block,
      irregularStateOrUndefined
    );

    await this._rethnetAdapter.setBlockContext(
      block,
      irregularStateOrUndefined
    );
  }

  public async startBlock(): Promise<void> {
    await this._rethnetAdapter.startBlock();
    await this._ethereumJSAdapter.startBlock();
  }

  public async runTxInBlock(
    tx: TypedTransaction,
    block: Block
  ): Promise<[RunTxResult, Trace]> {
    const ethereumJSResultPromise = this._ethereumJSAdapter.runTxInBlock(
      tx,
      block
    );

    const rethnetResultPromise = this._rethnetAdapter.runTxInBlock(tx, block);

    const [[ethereumJSResult, ethereumJSTrace], [rethnetResult, rethnetTrace]] =
      await Promise.all([ethereumJSResultPromise, rethnetResultPromise]);

    try {
      assertEqualRunTxResults(ethereumJSResult, rethnetResult);

      if (rethnetResult.createdAddress !== undefined) {
        const _test = this.getAccount(rethnetResult.createdAddress);
      }

      return [ethereumJSResult, ethereumJSTrace];
    } catch (e) {
      // if the results didn't match, print the traces
      console.log("EthereumJS trace");
      printEthereumJSTrace(ethereumJSTrace);
      console.log();
      console.log("Rethnet trace");
      printRethnetTrace(rethnetTrace);

      throw e;
    }
  }

  public async addBlockRewards(
    rewards: Array<[Address, bigint]>
  ): Promise<void> {
    await this._rethnetAdapter.addBlockRewards(rewards);
    return this._ethereumJSAdapter.addBlockRewards(rewards);
  }

  public async sealBlock(): Promise<void> {
    await this._rethnetAdapter.sealBlock();
    return this._ethereumJSAdapter.sealBlock();
  }

  public async revertBlock(): Promise<void> {
    await this._rethnetAdapter.revertBlock();
    return this._ethereumJSAdapter.revertBlock();
  }

  public async makeSnapshot(): Promise<Buffer> {
    const ethereumJSRoot = await this._ethereumJSAdapter.makeSnapshot();
    const rethnetRoot = await this._rethnetAdapter.makeSnapshot();

    if (!ethereumJSRoot.equals(rethnetRoot)) {
      console.trace(
        `Different snapshot state root: ${ethereumJSRoot.toString(
          "hex"
        )} !== ${rethnetRoot.toString("hex")}`
      );
      throw new Error("Different snapshot state root");
    }

    return rethnetRoot;
  }

  private _currentBeforeMessage: TracingMessage | undefined;
  private _currentBeforeMessageNext: any;
  private _currentStep: TracingStep | undefined;
  private _currentStepNext: any;
  private _currentMessageResult: TracingMessageResult | undefined;
  private _currentMessageResultNext: any;

  private _ethereumJSBeforeMessagehandler = async (
    message: TracingMessage,
    next: any
  ) => {
    return this._beforeMessageHandler(message, next, true);
  };

  private _rethnetBeforeMessagehandler = async (
    message: TracingMessage,
    next: any
  ) => {
    return this._beforeMessageHandler(message, next, false);
  };

  private _beforeMessageHandler = async (
    message: TracingMessage,
    next: any,
    isEthJS: boolean
  ) => {
    if (this._tracingCallbacks === undefined) {
      return next();
    }

    if (this._currentBeforeMessage === undefined) {
      // this method executed first, save results
      this._currentBeforeMessage = message;
      this._currentBeforeMessageNext = next;
    } else {
      // this method executed second, compare results
      if (!message.data.equals(this._currentBeforeMessage.data)) {
        const current = isEthJS ? "ethereumjs" : "rethnet";
        const previous = isEthJS ? "rethnet" : "ethereumjs";
        const errorMessage = `Different data in before message handler, ${current}: '${message.data.toString(
          "hex"
        )}', ${previous}: '${this._currentBeforeMessage.data.toString("hex")}'`;

        // both log and send the error, because the error message sometimes is
        // swallowed by the tests
        console.log("==========>", errorMessage);
        next(new Error(errorMessage));
      }

      // continue the execution of the other adapter
      this._currentBeforeMessageNext();

      // clean the state
      this._currentBeforeMessage = undefined;
      this._currentBeforeMessageNext = undefined;

      return this._tracingCallbacks.beforeMessage(message, next);
    }
  };

  private _ethereumJSStepHandler = async (step: TracingStep, next: any) => {
    return this._stepHandler(step, next, true);
  };

  private _rethnetStepHandler = async (step: TracingStep, next: any) => {
    return this._stepHandler(step, next, false);
  };

  private _stepHandler = async (
    step: TracingStep,
    next: any,
    isEthJS: boolean
  ) => {
    if (this._tracingCallbacks === undefined) {
      return next();
    }

    if (this._currentStep === undefined) {
      // this method executed first, save results
      this._currentStep = step;
      this._currentStepNext = next;
    } else {
      // this method executed second, compare results
      if (step.pc !== this._currentStep.pc) {
        const current = isEthJS ? "ethereumjs" : "rethnet";
        const previous = isEthJS ? "rethnet" : "ethereumjs";
        const errorMessage = `Different pc in step handler, ${current}: '${step.pc}', ${previous}: '${this._currentStep.pc}'`;

        // both log and send the error, because the error message sometimes is
        // swallowed by the tests
        console.log("==========>", errorMessage);
        next(new Error(errorMessage));
      }

      // continue the execution of the other adapter
      this._currentStepNext();

      // clean the state
      this._currentStep = undefined;
      this._currentStepNext = undefined;

      return this._tracingCallbacks.step(step, next);
    }
  };

  private _ethereumJSAfterMessageHandler = async (
    result: TracingMessageResult,
    next: any
  ) => {
    return this._afterMessageHandler(result, next, true);
  };

  private _rethnetAfterMessageHandler = async (
    result: TracingMessageResult,
    next: any
  ) => {
    return this._afterMessageHandler(result, next, false);
  };

  private _afterMessageHandler = async (
    result: TracingMessageResult,
    next: any,
    isEthJS: boolean
  ) => {
    if (this._tracingCallbacks === undefined) {
      return next();
    }

    if (this._currentMessageResult === undefined) {
      // this method executed first, save results
      this._currentMessageResult = result;
      this._currentMessageResultNext = next;
    } else {
      // this method executed second, compare results
      if (
        result.executionResult.exitCode !==
        this._currentMessageResult.executionResult.exitCode
      ) {
        const current = isEthJS ? "ethereumjs" : "rethnet";
        const previous = isEthJS ? "rethnet" : "ethereumjs";
        const errorMessage = `Different exit codes in after message handler, ${current}: '${result.executionResult.exitCode}', ${previous}: '${this._currentMessageResult.executionResult.exitCode}'`;

        // both log and send the error, because the error message sometimes is
        // swallowed by the tests
        console.log("==========>", errorMessage);
        next(new Error(errorMessage));
      }

      // continue the execution of the other adapter
      this._currentMessageResultNext();

      // clean the state
      this._currentMessageResult = undefined;
      this._currentMessageResultNext = undefined;

      return this._tracingCallbacks.afterMessage(result, next);
    }
  };
}

function assertEqualRunTxResults(
  ethereumJSResult: RunTxResult,
  rethnetResult: RunTxResult
) {
  if (ethereumJSResult.gasUsed !== rethnetResult.gasUsed) {
    console.trace(
      `Different totalGasSpent: ${ethereumJSResult.gasUsed} !== ${rethnetResult.gasUsed}`
    );
    throw new Error("Different totalGasSpent");
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

  if (ethereumJSResult.exit.kind !== rethnetResult.exit.kind) {
    console.trace(
      `Different exceptionError.error: ${ethereumJSResult.exit.kind} !== ${rethnetResult.exit.kind}`
    );
    throw new Error("Different exceptionError.error");
  }

  // TODO: we only compare the return values when a contract was *not* created,
  // because sometimes ethereumjs has the created bytecode in the return value
  // and rethnet doesn't
  if (ethereumJSResult.createdAddress === undefined) {
    if (
      ethereumJSResult.returnValue.toString("hex") !==
      rethnetResult.returnValue.toString("hex")
    ) {
      console.trace(
        `Different returnValue: ${ethereumJSResult.returnValue.toString(
          "hex"
        )} !== ${rethnetResult.returnValue.toString("hex")}`
      );
      throw new Error("Different returnValue");
    }
  }

  if (!ethereumJSResult.bloom.equals(rethnetResult.bloom)) {
    console.trace(
      `Different bloom: ${ethereumJSResult.bloom} !== ${rethnetResult.bloom}`
    );
    throw new Error("Different bloom");
  }

  if (
    !ethereumJSResult.receipt.bitvector.equals(rethnetResult.receipt.bitvector)
  ) {
    console.trace(
      `Different receipt bitvector: ${ethereumJSResult.receipt.bitvector} !== ${rethnetResult.receipt.bitvector}`
    );
    throw new Error("Different receipt bitvector");
  }

  if (
    ethereumJSResult.receipt.cumulativeBlockGasUsed !==
    rethnetResult.receipt.cumulativeBlockGasUsed
  ) {
    console.trace(
      `Different receipt cumulativeBlockGasUsed: ${ethereumJSResult.receipt.cumulativeBlockGasUsed} !== ${rethnetResult.receipt.cumulativeBlockGasUsed}`
    );
    throw new Error("Different receipt cumulativeBlockGasUsed");
  }

  assertEqualLogs(ethereumJSResult.receipt.logs, rethnetResult.receipt.logs);
}

function assertEqualLogs(ethereumJSLogs: Log[], rethnetLogs: Log[]) {
  if (ethereumJSLogs.length !== rethnetLogs.length) {
    console.trace(
      `Different logs length: ${ethereumJSLogs.length} !== ${rethnetLogs.length}`
    );
    throw new Error("Different logs length");
  }

  for (let logIdx = 0; logIdx < ethereumJSLogs.length; ++logIdx) {
    if (!ethereumJSLogs[logIdx][0].equals(rethnetLogs[logIdx][0])) {
      console.trace(
        `Different log[${logIdx}] address: ${ethereumJSLogs[logIdx][0]} !== ${rethnetLogs[logIdx][0]}`
      );
      throw new Error("Different log address");
    }

    const ethereumJSTopics = ethereumJSLogs[logIdx][1];
    const rethnetTopics = rethnetLogs[logIdx][1];
    if (ethereumJSTopics.length !== rethnetTopics.length) {
      console.trace(
        `Different log[${logIdx}] topics length: ${ethereumJSTopics.length} !== ${rethnetTopics.length}`
      );
      throw new Error("Different log topics length");
    }

    for (let topicIdx = 0; topicIdx < ethereumJSTopics.length; ++topicIdx) {
      if (!ethereumJSTopics[topicIdx].equals(rethnetTopics[topicIdx])) {
        console.trace(
          `Different log[${logIdx}] topic[${topicIdx}]: ${ethereumJSTopics[topicIdx]} !== ${rethnetTopics[topicIdx]}`
        );
        throw new Error("Different log topic");
      }
    }

    if (!ethereumJSLogs[logIdx][2].equals(rethnetLogs[logIdx][2])) {
      console.trace(
        `Different log[${logIdx}] data: ${ethereumJSLogs[logIdx][2]} !== ${rethnetLogs[logIdx][2]}`
      );
      throw new Error("Different log data");
    }
  }
}

function assertEqualAccounts(
  address: Address,
  ethereumJSAccount: Account,
  rethnetAccount: Account
) {
  if (ethereumJSAccount.balance !== rethnetAccount.balance) {
    console.trace(`Account: ${address}`);
    console.trace(
      `Different balance: ${ethereumJSAccount.balance} !== ${rethnetAccount.balance}`
    );
    throw new Error("Different balance");
  }

  if (!ethereumJSAccount.codeHash.equals(rethnetAccount.codeHash)) {
    console.trace(
      `Different codeHash: ${ethereumJSAccount.codeHash} !== ${rethnetAccount.codeHash}`
    );
    throw new Error("Different codeHash");
  }

  if (ethereumJSAccount.nonce !== rethnetAccount.nonce) {
    console.trace(
      `Different nonce: ${ethereumJSAccount.nonce} !== ${rethnetAccount.nonce}`
    );
    throw new Error("Different nonce");
  }

  if (!ethereumJSAccount.storageRoot.equals(rethnetAccount.storageRoot)) {
    console.trace(
      `Different storageRoot: ${ethereumJSAccount.storageRoot} !== ${rethnetAccount.storageRoot}`
    );
    throw new Error("Different storageRoot");
  }
}
