import type {
  InterpreterStep,
  EVMResult,
  Message,
} from "@nomicfoundation/ethereumjs-evm";

import { Block } from "@nomicfoundation/ethereumjs-block";
import { Common } from "@nomicfoundation/ethereumjs-common";
import { TypedTransaction } from "@nomicfoundation/ethereumjs-tx";
import {
  Account,
  Address,
  bufferToHex,
} from "@nomicfoundation/ethereumjs-util";

import { StateOverrideSet } from "../../../core/jsonrpc/types/input/callRequest";
import { RpcDebugTracingConfig } from "../../../core/jsonrpc/types/input/debugTraceTransaction";
import {
  isEvmStep,
  isPrecompileTrace,
  MessageTrace,
} from "../../stack-traces/message-trace";
import { opcodeName } from "../../stack-traces/opcodes";
import { VMTracer } from "../../stack-traces/vm-tracer";
import { RpcDebugTraceOutput } from "../output";
import { getGlobalEdrContext } from "../context/edr";
import { randomHashSeed } from "../fork/ForkStateManager";
import { assertEqualRunTxResults } from "../utils/assertions";

import { RunTxResult, VMAdapter } from "./vm-adapter";
import { BlockBuilderAdapter, BuildBlockOpts } from "./block-builder";
import { DualModeBlockBuilder } from "./block-builder/dual";

/* eslint-disable @nomicfoundation/hardhat-internal-rules/only-hardhat-error */
/* eslint-disable @typescript-eslint/restrict-template-expressions */

function _printTrace(trace: any) {
  console.log(
    JSON.stringify(
      trace,
      function (key, value) {
        if (key === "op") {
          return opcodeName(value);
        } else if (typeof value === "bigint") {
          return value.toString();
        } else {
          return value;
        }
      },
      2
    )
  );
}

export class DualModeAdapter implements VMAdapter {
  private readonly _ethereumJSVMTracer: VMTracer;
  private readonly _edrVMTracer: VMTracer;

  constructor(
    common: Common,
    private readonly _ethereumJSAdapter: VMAdapter,
    private readonly _edrAdapter: VMAdapter
  ) {
    this._ethereumJSVMTracer = new VMTracer(common, false);
    this._edrVMTracer = new VMTracer(common, false);
  }

  public async dryRun(
    tx: TypedTransaction,
    blockNumber: bigint,
    forceBaseFeeZero?: boolean,
    stateOverrideSet: StateOverrideSet = {}
  ): Promise<RunTxResult> {
    try {
      const [ethereumJSResult, edrResult] = await Promise.all([
        this._ethereumJSAdapter.dryRun(
          tx,
          blockNumber,
          forceBaseFeeZero,
          stateOverrideSet
        ),
        this._edrAdapter.dryRun(
          tx,
          blockNumber,
          forceBaseFeeZero,
          stateOverrideSet
        ),
      ]);

      // Matches EthereumJS' runCall checkpoint call
      getGlobalEdrContext().setStateRootGeneratorSeed(randomHashSeed());

      assertEqualRunTxResults(ethereumJSResult, edrResult);
      return edrResult;
    } catch (error) {
      // Ensure that the state root generator seed is re-aligned upon an error
      getGlobalEdrContext().setStateRootGeneratorSeed(randomHashSeed());

      throw error;
    }
  }

  public async getStateRoot(): Promise<Buffer> {
    const ethereumJSRoot = await this._ethereumJSAdapter.getStateRoot();
    const edrRoot = await this._edrAdapter.getStateRoot();

    if (!ethereumJSRoot.equals(edrRoot)) {
      console.trace(
        `Different state root: ${ethereumJSRoot.toString(
          "hex"
        )} (ethereumjs) !== ${edrRoot.toString("hex")} (edr)`
      );
      await this.printState();
      throw new Error("Different state root");
    }

    return edrRoot;
  }

  public async getAccount(address: Address): Promise<Account> {
    const ethereumJSAccount = await this._ethereumJSAdapter.getAccount(address);
    const edrAccount = await this._edrAdapter.getAccount(address);

    assertEqualAccounts(address, ethereumJSAccount, edrAccount);

    return edrAccount;
  }

  public async getContractStorage(
    address: Address,
    key: Buffer
  ): Promise<Buffer> {
    const ethereumJSStorageSlot =
      await this._ethereumJSAdapter.getContractStorage(address, key);

    const edrStorageSlot = await this._edrAdapter.getContractStorage(
      address,
      key
    );

    if (!ethereumJSStorageSlot.equals(edrStorageSlot)) {
      // we only throw if any of the returned values was non-empty, but
      // ethereumjs and edr return different values when that happens
      if (
        ethereumJSStorageSlot.length !== 0 ||
        !edrStorageSlot.equals(Buffer.from([0x00]))
      ) {
        console.trace(
          `Different storage slot: ${bufferToHex(
            ethereumJSStorageSlot
          )} (ethereumjs) !== ${bufferToHex(edrStorageSlot)} (edr)`
        );
        throw new Error("Different storage slot");
      }
    }

    return edrStorageSlot;
  }

  public async getContractCode(address: Address): Promise<Buffer> {
    const ethereumJSCode = await this._ethereumJSAdapter.getContractCode(
      address
    );

    const edrCode = await this._edrAdapter.getContractCode(address);

    if (!ethereumJSCode.equals(edrCode)) {
      console.trace(
        `Different contract code: ${ethereumJSCode.toString(
          "hex"
        )} (ethereumjs) !== ${edrCode.toString("hex")} (edr)`
      );
      throw new Error("Different contract code");
    }

    return edrCode;
  }

  public async putAccount(
    address: Address,
    account: Account,
    isIrregularChange?: boolean
  ): Promise<void> {
    await this._ethereumJSAdapter.putAccount(
      address,
      account,
      isIrregularChange
    );
    await this._edrAdapter.putAccount(address, account, isIrregularChange);

    // Validate state roots
    await this.getStateRoot();
  }

  public async putContractCode(
    address: Address,
    value: Buffer,
    isIrregularChange?: boolean
  ): Promise<void> {
    await this._ethereumJSAdapter.putContractCode(
      address,
      value,
      isIrregularChange
    );
    await this._edrAdapter.putContractCode(address, value, isIrregularChange);

    // Validate state roots
    await this.getStateRoot();
  }

  public async putContractStorage(
    address: Address,
    key: Buffer,
    value: Buffer,
    isIrregularChange?: boolean
  ): Promise<void> {
    await this._ethereumJSAdapter.putContractStorage(
      address,
      key,
      value,
      isIrregularChange
    );
    await this._edrAdapter.putContractStorage(
      address,
      key,
      value,
      isIrregularChange
    );

    // Validate state roots
    await this.getStateRoot();
  }

  public async restoreBlockContext(blockNumber: bigint): Promise<void> {
    await this._ethereumJSAdapter.restoreBlockContext(blockNumber);
    await this._edrAdapter.restoreBlockContext(blockNumber);

    // Validate state roots
    await this.getStateRoot();
  }

  public async traceTransaction(
    hash: Buffer,
    block: Block,
    config: RpcDebugTracingConfig
  ): Promise<RpcDebugTraceOutput> {
    // When this is enabled, tests fail with diff state root error
    // const _ethereumJsResult = await this._ethereumJSAdapter.traceTransaction(
    //   hash,
    //   block,
    //   config
    // );

    const edrResult = await this._edrAdapter.traceTransaction(
      hash,
      block,
      config
    );

    getGlobalEdrContext().setStateRootGeneratorSeed(randomHashSeed());

    return edrResult;
  }

  public async traceCall(
    tx: TypedTransaction,
    blockNumber: bigint,
    config: RpcDebugTracingConfig
  ): Promise<RpcDebugTraceOutput> {
    // We aren't comparing the result as the output is expected to differ.
    const _ = await this._ethereumJSAdapter.traceCall(tx, blockNumber, config);
    return this._edrAdapter.traceCall(tx, blockNumber, config);
  }

  public async setBlockContext(blockNumber: bigint): Promise<void> {
    await this._ethereumJSAdapter.setBlockContext(blockNumber);
    await this._edrAdapter.setBlockContext(blockNumber);

    // Validate state roots
    await this.getStateRoot();
  }

  public async runTxInBlock(
    tx: TypedTransaction,
    block: Block
  ): Promise<RunTxResult> {
    try {
      const [ethereumJSResult, edrResult] = await Promise.all([
        this._ethereumJSAdapter.runTxInBlock(tx, block),
        this._edrAdapter.runTxInBlock(tx, block),
      ]);

      // Matches EthereumJS' runCall checkpoint call
      getGlobalEdrContext().setStateRootGeneratorSeed(randomHashSeed());

      assertEqualRunTxResults(ethereumJSResult, edrResult);

      // Validate trace
      const _trace = this.getLastTraceAndClear();

      return edrResult;
    } catch (error) {
      // Ensure that the state root generator seed is re-aligned upon an error
      getGlobalEdrContext().setStateRootGeneratorSeed(randomHashSeed());

      throw error;
    }
  }

  public async revert(): Promise<void> {
    await this._ethereumJSAdapter.revert();
    await this._edrAdapter.revert();

    // Validate state roots
    await this.getStateRoot();
  }

  public async makeSnapshot(): Promise<number> {
    const ethereumJSSnapshotId = await this._ethereumJSAdapter.makeSnapshot();
    const edrSnapshotId = await this._edrAdapter.makeSnapshot();

    if (ethereumJSSnapshotId !== edrSnapshotId) {
      console.trace(
        `Different snapshot id: ${ethereumJSSnapshotId} (ethereumjs) !== ${edrSnapshotId} (edr)`
      );
      await this.printState();
      throw new Error("Different snapshot id");
    }

    return edrSnapshotId;
  }

  public async restoreSnapshot(snapshotId: number): Promise<void> {
    await this._ethereumJSAdapter.restoreSnapshot(snapshotId);
    await this._edrAdapter.restoreSnapshot(snapshotId);

    // Validate state roots
    await this.getStateRoot();
  }

  public async removeSnapshot(snapshotId: number): Promise<void> {
    await this._ethereumJSAdapter.removeSnapshot(snapshotId);
    await this._edrAdapter.removeSnapshot(snapshotId);
  }

  public getLastTraceAndClear(): {
    trace: MessageTrace | undefined;
    error: Error | undefined;
  } {
    const { trace: ethereumJSTrace, error: ethereumJSError } =
      this._ethereumJSAdapter.getLastTraceAndClear();
    const { trace: edrTrace, error: edrError } =
      this._edrAdapter.getLastTraceAndClear();

    if (ethereumJSTrace === undefined) {
      if (edrTrace !== undefined) {
        throw new Error("ethereumJSTrace is undefined but edrTrace is defined");
      }
    } else {
      if (edrTrace === undefined) {
        throw new Error("ethereumJSTrace is defined but edrTrace is undefined");
      }

      const differences = traceDifferences(ethereumJSTrace, edrTrace);
      if (differences.length > 0) {
        console.trace(`Different traces: ${differences}`);
        // console.log("EthereumJS trace:");
        // printTrace(ethereumJSTrace);
        // console.log();
        // console.log("EDR trace:");
        // printTrace(edrTrace);
        throw new Error(`Different traces: ${differences}`);
      }
    }

    if (ethereumJSError === undefined) {
      if (edrError !== undefined) {
        throw new Error("ethereumJSError is undefined but edrError is defined");
      }
    } else {
      if (edrError === undefined) {
        throw new Error("ethereumJSError is defined but edrError is undefined");
      }

      // both errors are defined
      if (ethereumJSError.name !== edrError.name) {
        throw new Error(
          `Different error name: ${ethereumJSError.name} (ethereumjs) !== ${edrError.name} (edr)`
        );
      }

      if (ethereumJSError.message !== edrError.message) {
        throw new Error(
          `Different error message: ${ethereumJSError.message} (ethereumjs) !== ${edrError.message} (edr)`
        );
      }

      if (ethereumJSError.stack === undefined) {
        if (edrError.stack !== undefined) {
          throw new Error(
            "ethereumJSError.stack is undefined but edrError.stack is defined"
          );
        }
      } else {
        if (edrError.stack === undefined) {
          throw new Error(
            "ethereumJSError.stack is defined but edrError.stack is undefined"
          );
        }

        // both error stacks are defined
        if (ethereumJSError.stack !== edrError.stack) {
          throw new Error(
            `Different error stack: ${ethereumJSError.stack} (ethereumjs) !== ${edrError.stack} (edr)`
          );
        }
      }
    }

    const ethereumJSSteps = this._ethereumJSVMTracer.tracingSteps;
    const edrSteps = this._edrVMTracer.tracingSteps;
    if (ethereumJSSteps.length !== edrSteps.length) {
      throw new Error(
        `Different number of steps in tracers: ${this._ethereumJSVMTracer.tracingSteps.length} (ethereumjs) !== ${this._edrVMTracer.tracingSteps.length} (edr)`
      );
    }

    for (let stepIdx = 0; stepIdx < ethereumJSSteps.length; ++stepIdx) {
      const ethereumJSStep = ethereumJSSteps[stepIdx];
      const edrStep = edrSteps[stepIdx];

      if (ethereumJSStep.depth !== edrStep.depth) {
        console.trace(
          `Different steps[${stepIdx}] depth: ${ethereumJSStep.depth} (ethereumjs) !== ${edrStep.depth} (edr) (edr)`
        );
        throw new Error("Different step depth");
      }

      if (ethereumJSStep.pc !== edrStep.pc) {
        console.trace(
          `Different steps[${stepIdx}] pc: ${ethereumJSStep.pc} (ethereumjs) !== ${edrStep.pc} (edr) (edr)`
        );
        throw new Error("Different step pc");
      }

      // if (ethereumJSStep.opcode !== edrStep.opcode) {
      //   console.trace(
      //     `Different steps[${stepIdx}] opcode: ${ethereumJSStep.opcode} !== ${edrStep.opcode}`
      //   );
      //   throw new Error("Different step opcode");
      // }

      // if (ethereumJSStep.gasCost !== edrStep.gasCost) {
      //   console.trace(
      //     `Different steps[${stepIdx}] gasCost: ${ethereumJSStep.gasCost} !== ${edrStep.gasCost}`
      //   );
      //   throw new Error("Different step gasCost");
      // }

      // if (ethereumJSStep.gasLeft !== edrStep.gasLeft) {
      //   console.trace(
      //     `Different steps[${stepIdx}] gasLeft: ${ethereumJSStep.gasLeft} !== ${edrStep.gasLeft}`
      //   );
      //   throw new Error("Different step gasLeft");
      // }

      // const ethereumJSStack = ethereumJSStep.stack;
      // const edrStack = edrStep.stack;
      // if (ethereumJSStack.length !== edrStack.length) {
      //   throw new Error(
      //     `Different number of stack elements in tracers: ${ethereumJSStack.length} !== ${edrStack.length}`
      //   );
      // }

      // for (let stackIdx = 0; stackIdx < ethereumJSSteps.length; ++stackIdx) {
      //   const ethereumJSStackElement = ethereumJSStack[stackIdx];
      //   const edrStackElement = edrStack[stackIdx];

      //   if (ethereumJSStackElement !== edrStackElement) {
      //     console.trace(
      //       `Different steps[${stepIdx}] stack[${stackIdx}]: ${ethereumJSStackElement} !== ${edrStackElement}`
      //     );
      //     throw new Error("Different step stack element");
      //   }
      // }

      // if (!ethereumJSStep.memory.equals(edrStep.memory)) {
      //   console.trace(
      //     `Different steps[${stepIdx}] memory: ${ethereumJSStep.memory} !== ${edrStep.memory}`
      //   );
      //   throw new Error("Different step memory");
      // }

      // if (ethereumJSStep.contract.balance !== edrStep.contract.balance) {
      //   console.trace(
      //     `Different steps[${stepIdx}] contract balance: ${ethereumJSStep.contract.balance} !== ${edrStep.contract.balance}`
      //   );
      //   throw new Error("Different step contract balance");
      // }

      // if (ethereumJSStep.contract.nonce !== edrStep.contract.nonce) {
      //   console.trace(
      //     `Different steps[${stepIdx}] contract nonce: ${ethereumJSStep.contract.nonce} !== ${edrStep.contract.nonce}`
      //   );
      //   throw new Error("Different step contract nonce");
      // }

      // Code can be stored separately from the account in EDR
      // const ethereumJSCode = ethereumJSStep.contract.code;
      // const edrCode = edrStep.contract.code;
      // if (ethereumJSCode === undefined) {
      //   if (edrCode !== undefined) {
      //     console.trace(
      //       `Different steps[${stepIdx}] contract code: ${ethereumJSCode} !== ${edrCode}`
      //     );

      //     throw new Error(
      //       "ethereumJSCode is undefined but edrCode is defined"
      //     );
      //   }
      // } else {
      //   if (edrCode === undefined) {
      //     console.trace(
      //       `Different steps[${stepIdx}] contract code: ${ethereumJSCode} !== ${edrCode}`
      //     );

      //     throw new Error(
      //       "ethereumJSCode is defined but edrCode is undefined"
      //     );
      //   }

      //   if (!ethereumJSCode.equals(edrCode)) {
      //     console.trace(
      //       `Different steps[${stepIdx}] contract code: ${ethereumJSCode} !== ${edrCode}`
      //     );
      //     throw new Error("Different step contract code");
      //   }
      // }

      // if (!ethereumJSStep.contractAddress.equals(edrStep.contractAddress)) {
      //   console.trace(
      //     `Different steps[${stepIdx}] contract address: ${ethereumJSStep.contractAddress} !== ${edrStep.contractAddress}`
      //   );
      //   throw new Error("Different step contract address");
      // }
    }

    // TODO: compare each step
    // TODO: compare tracers tracingMessages and tracingMessageResults

    return {
      trace: edrTrace,
      error: edrError,
    };
  }

  public clearLastError() {
    this._ethereumJSVMTracer.clearLastError();
    this._edrVMTracer.clearLastError();
  }

  public async printState() {
    console.log("EthereumJS:");
    await this._ethereumJSAdapter.printState();
    console.log("EDR:");
    await this._edrAdapter.printState();
  }

  public async createBlockBuilder(
    common: Common,
    opts: BuildBlockOpts
  ): Promise<BlockBuilderAdapter> {
    const [ethereumJSBlockBuilder, edrBlockBuilder] = await Promise.all([
      this._ethereumJSAdapter.createBlockBuilder(common, opts),
      this._edrAdapter.createBlockBuilder(common, opts),
    ]);

    return new DualModeBlockBuilder(ethereumJSBlockBuilder, edrBlockBuilder);
  }

  public onStep(_cb: (step: InterpreterStep, next?: any) => Promise<void>) {
    throw new Error("Method not implemented.");
  }

  public onBeforeMessage(_cb: (message: Message, next?: any) => Promise<void>) {
    throw new Error("Method not implemented.");
  }

  public onAfterMessage(_cb: (result: EVMResult, next?: any) => Promise<void>) {
    throw new Error("Method not implemented.");
  }
}

function assertEqualAccounts(
  address: Address,
  ethereumJSAccount: Account,
  edrAccount: Account
) {
  const differences: string[] = [];

  if (ethereumJSAccount.balance !== edrAccount.balance) {
    console.trace(`Account: ${address}`);
    console.trace(
      `Different balance: ${ethereumJSAccount.balance} (ethereumjs) !== ${edrAccount.balance} (edr)`
    );
    differences.push("balance");
  }

  if (!ethereumJSAccount.codeHash.equals(edrAccount.codeHash)) {
    console.trace(
      `Different codeHash: ${ethereumJSAccount.codeHash} !== ${edrAccount.codeHash}`
    );
    differences.push("codeHash");
  }

  if (ethereumJSAccount.nonce !== edrAccount.nonce) {
    console.trace(
      `Different nonce: ${ethereumJSAccount.nonce} !== ${edrAccount.nonce}`
    );
    differences.push("nonce");
  }

  if (!ethereumJSAccount.storageRoot.equals(edrAccount.storageRoot)) {
    console.trace(
      `Different storageRoot: ${ethereumJSAccount.storageRoot.toString(
        "hex"
      )} !== ${edrAccount.storageRoot.toString("hex")}`
    );
    differences.push("storageRoot");
  }

  if (differences.length !== 0) {
    console.trace(`Different accounts (${address.toString()}): ${differences}`);
    throw new Error(
      `Different accounts (${address.toString()}): ${differences}`
    );
  }
}

function traceDifferences(
  ethereumJSTrace: MessageTrace,
  edrTrace: MessageTrace
): string[] {
  const differences: string[] = [];

  // both traces are defined
  if (ethereumJSTrace.depth !== edrTrace.depth) {
    console.log(
      `Different depth: ${ethereumJSTrace.depth} !== ${edrTrace.depth}`
    );
    differences.push("depth");
  }

  if (ethereumJSTrace.exit.kind !== edrTrace.exit.kind) {
    console.log(
      `Different exit: ${ethereumJSTrace.exit.kind} !== ${edrTrace.exit.kind}`
    );
    differences.push("exit");
  }

  if (ethereumJSTrace.gasUsed !== edrTrace.gasUsed) {
    console.log(
      `Different gasUsed: ${ethereumJSTrace.gasUsed} !== ${edrTrace.gasUsed}`
    );
    differences.push("gasUsed");
  }

  if (!ethereumJSTrace.returnData.equals(edrTrace.returnData)) {
    console.log(
      `Different returnData: ${ethereumJSTrace.returnData} !== ${edrTrace.returnData}`
    );
    differences.push("returnData");
  }

  if (ethereumJSTrace.value !== edrTrace.value) {
    console.log(
      `Different value: ${ethereumJSTrace.value} !== ${edrTrace.value}`
    );
    differences.push("value");
  }

  if (isPrecompileTrace(ethereumJSTrace)) {
    if (!isPrecompileTrace(edrTrace)) {
      throw new Error(
        `ethereumJSTrace is a precompiled trace but edrTrace is not`
      );
    }

    // Both traces are precompile traces
    if (ethereumJSTrace.precompile !== edrTrace.precompile) {
      console.log(
        `Different precompile: ${ethereumJSTrace.precompile} !== ${edrTrace.precompile}`
      );
      differences.push("precompile");
    }

    if (!ethereumJSTrace.calldata.equals(edrTrace.calldata)) {
      console.log(
        `Different calldata: ${ethereumJSTrace.calldata} !== ${edrTrace.calldata}`
      );
      differences.push("calldata");
    }
  } else {
    if (isPrecompileTrace(edrTrace)) {
      throw new Error(
        `edrTrace is a precompiled trace but ethereumJSTrace is not`
      );
    }

    // Both traces are NOT precompile traces
    if (!ethereumJSTrace.code.equals(edrTrace.code)) {
      console.log(
        `Different code: ${ethereumJSTrace.code.toString(
          "hex"
        )} (ethereumjs) !== ${edrTrace.code.toString("hex")} (edr)`
      );
      differences.push("code");
    }

    if (ethereumJSTrace.steps.length !== edrTrace.steps.length) {
      console.log(
        `Different steps length: ${ethereumJSTrace.steps.length} !== ${edrTrace.steps.length}`
      );
      differences.push("steps.length");
    }

    for (let stepIdx = 0; stepIdx < ethereumJSTrace.steps.length; stepIdx++) {
      const ethereumJSStep = ethereumJSTrace.steps[stepIdx];
      const edrStep = edrTrace.steps[stepIdx];

      const stepDifferences: string[] = [];

      if (isEvmStep(ethereumJSStep)) {
        // if (stepIdx >= edrTrace.steps.length) {
        //   console.log("code:", ethereumJSTrace.code);
        //   console.log(stepIdx);
        //   console.log(ethereumJSStep);
        //   console.log("opcode:", ethereumJSTrace.code[ethereumJSStep.pc]);
        //   continue;
        // }

        if (!isEvmStep(edrStep)) {
          throw new Error(
            `ethereumJSStep '${stepIdx}' is an EVM step but edrStep '${stepIdx}' is not`
          );
        }

        if (ethereumJSStep.pc !== edrStep.pc) {
          console.log(
            `Different step[${stepIdx}] pc: ${ethereumJSStep.pc} !== ${edrStep.pc}`
          );
          stepDifferences.push("pc");
        }
      } else {
        if (isEvmStep(edrStep)) {
          throw new Error(
            `edrStep '${stepIdx}' is an EVM step but ethereumJSStep '${stepIdx}' is not`
          );
        }

        const messageDifferences = traceDifferences(ethereumJSStep, edrStep);

        if (messageDifferences.length > 0) {
          stepDifferences.push(`message: ${messageDifferences}`);
        }
      }

      if (stepDifferences.length > 0) {
        differences.push(`step[${stepIdx}]: ${stepDifferences}`);
      }
    }

    if (ethereumJSTrace.bytecode === undefined) {
      if (edrTrace.bytecode !== undefined) {
        console.log(
          "ethereumJSTrace.bytecode is undefined but edrTrace.bytecode is defined"
        );
        differences.push("bytecode");
      }
    } else {
      if (edrTrace.bytecode === undefined) {
        throw new Error(
          "ethereumJSTrace.bytecode is defined but edrTrace.bytecode is undefined"
        );
      }

      // Both traces contain bytecode
      if (!ethereumJSTrace.bytecode.equals(edrTrace.bytecode)) {
        console.log(
          `Different bytecode: ${ethereumJSTrace.bytecode} !== ${edrTrace.bytecode}`
        );
        differences.push("bytecode");
      }
    }

    if (ethereumJSTrace.numberOfSubtraces !== edrTrace.numberOfSubtraces) {
      console.log(
        `Different numberOfSubtraces: ${ethereumJSTrace.numberOfSubtraces} !== ${edrTrace.numberOfSubtraces}`
      );
      differences.push("numberOfSubtraces");
    }
  }

  return differences;
}
