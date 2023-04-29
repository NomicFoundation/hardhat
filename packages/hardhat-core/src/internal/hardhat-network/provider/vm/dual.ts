import { Block } from "@nomicfoundation/ethereumjs-block";
import { Common } from "@nomicfoundation/ethereumjs-common";
import { Log } from "@nomicfoundation/ethereumjs-evm";
import { TypedTransaction } from "@nomicfoundation/ethereumjs-tx";
import {
  Account,
  Address,
  bufferToHex,
} from "@nomicfoundation/ethereumjs-util";

import { assertHardhatInvariant } from "../../../core/errors";
import { RpcDebugTracingConfig } from "../../../core/jsonrpc/types/input/debugTraceTransaction";
import {
  isEvmStep,
  isPrecompileTrace,
  MessageTrace,
} from "../../stack-traces/message-trace";
import { opcodeName } from "../../stack-traces/opcodes";
import { VMTracer } from "../../stack-traces/vm-tracer";
import { isForkedNodeConfig, NodeConfig } from "../node-types";
import { RpcDebugTraceOutput } from "../output";
import { randomHashSeed } from "../fork/ForkStateManager";
import { HardhatBlockchainInterface } from "../types/HardhatBlockchainInterface";

import { EthereumJSAdapter } from "./ethereumjs";
import { ExitCode } from "./exit";
import { globalRethnetContext, RethnetAdapter } from "./rethnet";
import { RunTxResult, Trace, VMAdapter } from "./vm-adapter";

/* eslint-disable @nomiclabs/hardhat-internal-rules/only-hardhat-error */
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
  constructor(
    private _ethereumJSAdapter: VMAdapter,
    private _rethnetAdapter: VMAdapter,
    private _ethereumJSVMTracer: VMTracer,
    private _rethnetVMTracer: VMTracer
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

    // if the fork node config doesn't specify a fork block number, then the
    // ethereum-js VM used the latest block number from the forked chain. here
    // we get that number from that VM so it can be passed into the rethnet VM;
    // otherwise, the rethnet VM's determination of "latest" might be a later
    // number, resulting in a different fork block.
    if (
      isForkedNodeConfig(config) &&
      config.forkConfig.blockNumber === undefined
    ) {
      const forkBlockNumber = ethereumJSAdapter.getForkBlockNumber();
      if (forkBlockNumber !== undefined) {
        config.forkConfig.blockNumber = parseInt(
          forkBlockNumber.toString(10),
          10
        );
      }
    }

    const rethnetAdapter = await RethnetAdapter.create(
      config,
      selectHardfork,
      async (blockNumber) => {
        const block = await blockchain.getBlock(blockNumber);
        assertHardhatInvariant(block !== null, "Should be able to get block");

        return block.header.hash();
      },
      common
    );

    const ethereumJSVMTracer = new VMTracer(common, false);
    const rethnetVMTracer = new VMTracer(common, false);

    return new DualModeAdapter(
      ethereumJSAdapter,
      rethnetAdapter,
      ethereumJSVMTracer,
      rethnetVMTracer
    );
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

    // Matches EthereumJS' runCall checkpoint call
    globalRethnetContext.setHashGeneratorSeed(randomHashSeed());

    const [
      [ethereumJSResult, _ethereumJSTrace],
      [rethnetResult, rethnetTrace],
    ] = await Promise.all([ethereumJSResultPromise, rethnetResultPromise]);

    try {
      assertEqualRunTxResults(ethereumJSResult, rethnetResult);
      return [rethnetResult, rethnetTrace];
    } catch (e) {
      // if the results didn't match, print the traces
      // console.log("EthereumJS trace");
      // printEthereumJSTrace(ethereumJSTrace);
      // console.log();
      // console.log("Rethnet trace");
      // printRethnetTrace(rethnetTrace);

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
        )} (ethereumjs) !== ${rethnetRoot.toString("hex")} (rethnet)`
      );
      await this.printState();
      throw new Error("Different state root");
    }

    return rethnetRoot;
  }

  public async getAccount(address: Address): Promise<Account> {
    const ethereumJSAccount = await this._ethereumJSAdapter.getAccount(address);
    const rethnetAccount = await this._rethnetAdapter.getAccount(address);

    assertEqualAccounts(address, ethereumJSAccount, rethnetAccount);

    return rethnetAccount;
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
          )} (ethereumjs) !== ${bufferToHex(rethnetStorageSlot)} (rethnet)`
        );
        throw new Error("Different storage slot");
      }
    }

    return rethnetStorageSlot;
  }

  public async getContractCode(address: Address): Promise<Buffer> {
    const ethereumJSCode = await this._ethereumJSAdapter.getContractCode(
      address
    );

    const rethnetCode = await this._rethnetAdapter.getContractCode(address);

    if (!ethereumJSCode.equals(rethnetCode)) {
      console.trace(
        `Different contract code: ${ethereumJSCode.toString(
          "hex"
        )} (ethereumjs) !== ${rethnetCode.toString("hex")} (rethnet)`
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
    const [
      [ethereumJSResult, ethereumJSDebugTrace],
      [rethnetResult, _rethnetDebugTrace],
    ] = await Promise.all([
      this._ethereumJSAdapter.runTxInBlock(tx, block),
      this._rethnetAdapter.runTxInBlock(tx, block),
    ]);

    // Matches EthereumJS' runCall checkpoint call
    globalRethnetContext.setHashGeneratorSeed(randomHashSeed());

    try {
      assertEqualRunTxResults(ethereumJSResult, rethnetResult);

      // Validate trace
      const _trace = this.getLastTrace();

      return [rethnetResult, ethereumJSDebugTrace];
    } catch (e) {
      // if the results didn't match, print the traces
      // console.log("EthereumJS trace");
      // printEthereumJSTrace(ethereumJSTrace);
      // console.log();
      // console.log("Rethnet trace");
      // printRethnetTrace(rethnetTrace);

      throw e;
    }
  }

  public async addBlockRewards(
    rewards: Array<[Address, bigint]>
  ): Promise<void> {
    await this._rethnetAdapter.addBlockRewards(rewards);
    await this._ethereumJSAdapter.addBlockRewards(rewards);
  }

  public async sealBlock(): Promise<void> {
    await this._rethnetAdapter.sealBlock();
    await this._ethereumJSAdapter.sealBlock();
  }

  public async revertBlock(): Promise<void> {
    await this._rethnetAdapter.revertBlock();
    await this._ethereumJSAdapter.revertBlock();
  }

  public async makeSnapshot(): Promise<Buffer> {
    const ethereumJSRoot = await this._ethereumJSAdapter.makeSnapshot();
    const rethnetRoot = await this._rethnetAdapter.makeSnapshot();

    if (!ethereumJSRoot.equals(rethnetRoot)) {
      console.trace(
        `Different snapshot state root: ${ethereumJSRoot.toString(
          "hex"
        )} (ethereumjs) !== ${rethnetRoot.toString("hex")} (rethnet)`
      );
      await this.printState();
      throw new Error("Different snapshot state root");
    }

    return rethnetRoot;
  }

  public async removeSnapshot(stateRoot: Buffer): Promise<void> {
    await this._ethereumJSAdapter.removeSnapshot(stateRoot);
    await this._rethnetAdapter.removeSnapshot(stateRoot);
  }

  public getLastTrace(): {
    trace: MessageTrace | undefined;
    error: Error | undefined;
  } {
    const { trace: ethereumJSTrace, error: ethereumJSError } =
      this._ethereumJSAdapter.getLastTrace();
    const { trace: rethnetTrace, error: rethnetError } =
      this._rethnetAdapter.getLastTrace();

    if (ethereumJSTrace === undefined) {
      if (rethnetTrace !== undefined) {
        throw new Error(
          "ethereumJSTrace is undefined but rethnetTrace is defined"
        );
      }
    } else {
      if (rethnetTrace === undefined) {
        throw new Error(
          "ethereumJSTrace is defined but rethnetTrace is undefined"
        );
      }

      const differences = traceDifferences(ethereumJSTrace, rethnetTrace);
      if (differences.length > 0) {
        console.trace(`Different traces: ${differences}`);
        // console.log("EthereumJS trace:");
        // printTrace(ethereumJSTrace);
        // console.log();
        // console.log("Rethnet trace:");
        // printTrace(rethnetTrace);
        throw new Error(`Different traces: ${differences}`);
      }
    }

    if (ethereumJSError === undefined) {
      if (rethnetError !== undefined) {
        throw new Error(
          "ethereumJSError is undefined but rethnetError is defined"
        );
      }
    } else {
      if (rethnetError === undefined) {
        throw new Error(
          "ethereumJSError is defined but rethnetError is undefined"
        );
      }

      // both errors are defined
      if (ethereumJSError.name !== rethnetError.name) {
        throw new Error(
          `Different error name: ${ethereumJSError.name} (ethereumjs) !== ${rethnetError.name} (rethnet)`
        );
      }

      if (ethereumJSError.message !== rethnetError.message) {
        throw new Error(
          `Different error message: ${ethereumJSError.message} (ethereumjs) !== ${rethnetError.message} (rethnet)`
        );
      }

      if (ethereumJSError.stack === undefined) {
        if (rethnetError.stack !== undefined) {
          throw new Error(
            "ethereumJSError.stack is undefined but rethnetError.stack is defined"
          );
        }
      } else {
        if (rethnetError.stack === undefined) {
          throw new Error(
            "ethereumJSError.stack is defined but rethnetError.stack is undefined"
          );
        }

        // both error stacks are defined
        if (ethereumJSError.stack !== rethnetError.stack) {
          throw new Error(
            `Different error stack: ${ethereumJSError.stack} (ethereumjs) !== ${rethnetError.stack} (rethnet)`
          );
        }
      }
    }

    const ethereumJSSteps = this._ethereumJSVMTracer.tracingSteps;
    const rethnetSteps = this._rethnetVMTracer.tracingSteps;
    if (ethereumJSSteps.length !== rethnetSteps.length) {
      throw new Error(
        `Different number of steps in tracers: ${this._ethereumJSVMTracer.tracingSteps.length} (ethereumjs) !== ${this._rethnetVMTracer.tracingSteps.length} (rethnet)`
      );
    }

    for (let stepIdx = 0; stepIdx < ethereumJSSteps.length; ++stepIdx) {
      const ethereumJSStep = ethereumJSSteps[stepIdx];
      const rethnetStep = rethnetSteps[stepIdx];

      if (ethereumJSStep.depth !== rethnetStep.depth) {
        console.trace(
          `Different steps[${stepIdx}] depth: ${ethereumJSStep.depth} (ethereumjs) !== ${rethnetStep.depth} (rethnet) (rethnet)`
        );
        throw new Error("Different step depth");
      }

      if (ethereumJSStep.pc !== rethnetStep.pc) {
        console.trace(
          `Different steps[${stepIdx}] pc: ${ethereumJSStep.pc} (ethereumjs) !== ${rethnetStep.pc} (rethnet) (rethnet)`
        );
        throw new Error("Different step pc");
      }

      // if (ethereumJSStep.opcode !== rethnetStep.opcode) {
      //   console.trace(
      //     `Different steps[${stepIdx}] opcode: ${ethereumJSStep.opcode} !== ${rethnetStep.opcode}`
      //   );
      //   throw new Error("Different step opcode");
      // }

      // if (ethereumJSStep.gasCost !== rethnetStep.gasCost) {
      //   console.trace(
      //     `Different steps[${stepIdx}] gasCost: ${ethereumJSStep.gasCost} !== ${rethnetStep.gasCost}`
      //   );
      //   throw new Error("Different step gasCost");
      // }

      // if (ethereumJSStep.gasLeft !== rethnetStep.gasLeft) {
      //   console.trace(
      //     `Different steps[${stepIdx}] gasLeft: ${ethereumJSStep.gasLeft} !== ${rethnetStep.gasLeft}`
      //   );
      //   throw new Error("Different step gasLeft");
      // }

      // const ethereumJSStack = ethereumJSStep.stack;
      // const rethnetStack = rethnetStep.stack;
      // if (ethereumJSStack.length !== rethnetStack.length) {
      //   throw new Error(
      //     `Different number of stack elements in tracers: ${ethereumJSStack.length} !== ${rethnetStack.length}`
      //   );
      // }

      // for (let stackIdx = 0; stackIdx < ethereumJSSteps.length; ++stackIdx) {
      //   const ethereumJSStackElement = ethereumJSStack[stackIdx];
      //   const rethnetStackElement = rethnetStack[stackIdx];

      //   if (ethereumJSStackElement !== rethnetStackElement) {
      //     console.trace(
      //       `Different steps[${stepIdx}] stack[${stackIdx}]: ${ethereumJSStackElement} !== ${rethnetStackElement}`
      //     );
      //     throw new Error("Different step stack element");
      //   }
      // }

      // if (!ethereumJSStep.memory.equals(rethnetStep.memory)) {
      //   console.trace(
      //     `Different steps[${stepIdx}] memory: ${ethereumJSStep.memory} !== ${rethnetStep.memory}`
      //   );
      //   throw new Error("Different step memory");
      // }

      // if (ethereumJSStep.contract.balance !== rethnetStep.contract.balance) {
      //   console.trace(
      //     `Different steps[${stepIdx}] contract balance: ${ethereumJSStep.contract.balance} !== ${rethnetStep.contract.balance}`
      //   );
      //   throw new Error("Different step contract balance");
      // }

      // if (ethereumJSStep.contract.nonce !== rethnetStep.contract.nonce) {
      //   console.trace(
      //     `Different steps[${stepIdx}] contract nonce: ${ethereumJSStep.contract.nonce} !== ${rethnetStep.contract.nonce}`
      //   );
      //   throw new Error("Different step contract nonce");
      // }

      // Code can be stored separately from the account in Rethnet
      // const ethereumJSCode = ethereumJSStep.contract.code;
      // const rethnetCode = rethnetStep.contract.code;
      // if (ethereumJSCode === undefined) {
      //   if (rethnetCode !== undefined) {
      //     console.trace(
      //       `Different steps[${stepIdx}] contract code: ${ethereumJSCode} !== ${rethnetCode}`
      //     );

      //     throw new Error(
      //       "ethereumJSCode is undefined but rethnetCode is defined"
      //     );
      //   }
      // } else {
      //   if (rethnetCode === undefined) {
      //     console.trace(
      //       `Different steps[${stepIdx}] contract code: ${ethereumJSCode} !== ${rethnetCode}`
      //     );

      //     throw new Error(
      //       "ethereumJSCode is defined but rethnetCode is undefined"
      //     );
      //   }

      //   if (!ethereumJSCode.equals(rethnetCode)) {
      //     console.trace(
      //       `Different steps[${stepIdx}] contract code: ${ethereumJSCode} !== ${rethnetCode}`
      //     );
      //     throw new Error("Different step contract code");
      //   }
      // }

      // if (!ethereumJSStep.contractAddress.equals(rethnetStep.contractAddress)) {
      //   console.trace(
      //     `Different steps[${stepIdx}] contract address: ${ethereumJSStep.contractAddress} !== ${rethnetStep.contractAddress}`
      //   );
      //   throw new Error("Different step contract address");
      // }
    }

    // TODO: compare each step
    // TODO: compare tracers tracingMessages and tracingMessageResults

    return {
      trace: rethnetTrace,
      error: rethnetError,
    };
  }

  public clearLastError() {
    this._ethereumJSVMTracer.clearLastError();
    this._rethnetVMTracer.clearLastError();
  }

  public async printState() {
    console.log("EthereumJS:");
    await this._ethereumJSAdapter.printState();
    console.log("Rethnet:");
    await this._rethnetAdapter.printState();
  }
}

function assertEqualRunTxResults(
  ethereumJSResult: RunTxResult,
  rethnetResult: RunTxResult
) {
  const differences: string[] = [];

  if (ethereumJSResult.exit.kind !== rethnetResult.exit.kind) {
    console.trace(
      `Different exceptionError.error: ${ethereumJSResult.exit.kind} (ethereumjs) !== ${rethnetResult.exit.kind} (rethnet)`
    );
    differences.push("exceptionError.error");
  }

  if (ethereumJSResult.gasUsed !== rethnetResult.gasUsed) {
    console.trace(
      `Different totalGasSpent: ${ethereumJSResult.gasUsed} (ethereumjs) !== ${rethnetResult.gasUsed} (rethnet)`
    );
    differences.push("totalGasSpent");
  }

  const exitCode = ethereumJSResult.exit.kind;
  if (exitCode === ExitCode.SUCCESS || exitCode === ExitCode.REVERT) {
    // TODO: we only compare the return values when a contract was *not* created,
    // because sometimes ethereumjs has the created bytecode in the return value
    // and rethnet doesn't
    // if (ethereumJSResult.createdAddress === undefined) {
    if (
      ethereumJSResult.returnValue.toString("hex") !==
      rethnetResult.returnValue.toString("hex")
    ) {
      console.trace(
        `Different returnValue: ${ethereumJSResult.returnValue.toString(
          "hex"
        )} (ethereumjs) !== ${rethnetResult.returnValue.toString(
          "hex"
        )} (rethnet)`
      );
      differences.push("returnValue");
    }
    // }

    if (!ethereumJSResult.bloom.equals(rethnetResult.bloom)) {
      console.trace(
        `Different bloom: ${ethereumJSResult.bloom} (ethereumjs) !== ${rethnetResult.bloom} (rethnet)`
      );
      differences.push("bloom");
    }

    if (
      !ethereumJSResult.receipt.bitvector.equals(
        rethnetResult.receipt.bitvector
      )
    ) {
      console.trace(
        `Different receipt bitvector: ${ethereumJSResult.receipt.bitvector} (ethereumjs) !== ${rethnetResult.receipt.bitvector} (rethnet)`
      );
      differences.push("receipt.bitvector");
    }

    if (
      ethereumJSResult.receipt.cumulativeBlockGasUsed !==
      rethnetResult.receipt.cumulativeBlockGasUsed
    ) {
      console.trace(
        `Different receipt cumulativeBlockGasUsed: ${ethereumJSResult.receipt.cumulativeBlockGasUsed} (ethereumjs) !== ${rethnetResult.receipt.cumulativeBlockGasUsed} (rethnet)`
      );
      differences.push("receipt.cumulativeBlockGasUsed");
    }

    assertEqualLogs(ethereumJSResult.receipt.logs, rethnetResult.receipt.logs);
  }

  if (exitCode === ExitCode.SUCCESS) {
    if (
      ethereumJSResult.createdAddress?.toString() !==
        rethnetResult.createdAddress?.toString() &&
      // ethereumjs returns a createdAddress, even when reverting
      !(
        rethnetResult.createdAddress === undefined &&
        ethereumJSResult.exit.kind !== ExitCode.SUCCESS
      )
    ) {
      console.trace(
        `Different createdAddress: ${ethereumJSResult.createdAddress?.toString()} (ethereumjs) !== ${rethnetResult.createdAddress?.toString()} (rethnet)`
      );
      differences.push("createdAddress");
    }
  }

  if (differences.length !== 0) {
    throw new Error(`Different result fields: ${differences}`);
  }
}

function assertEqualLogs(ethereumJSLogs: Log[], rethnetLogs: Log[]) {
  const differences: string[] = [];

  if (ethereumJSLogs.length !== rethnetLogs.length) {
    console.trace(
      `Different logs length: ${ethereumJSLogs.length} (ethereumjs) !== ${rethnetLogs.length} (rethnet)`
    );
    differences.push("length");
  }

  for (let logIdx = 0; logIdx < ethereumJSLogs.length; ++logIdx) {
    if (!ethereumJSLogs[logIdx][0].equals(rethnetLogs[logIdx][0])) {
      console.trace(
        `Different log[${logIdx}] address: ${ethereumJSLogs[logIdx][0]} (ethereumjs) !== ${rethnetLogs[logIdx][0]} (rethnet)`
      );
      differences.push("address");
    }

    const ethereumJSTopics = ethereumJSLogs[logIdx][1];
    const rethnetTopics = rethnetLogs[logIdx][1];
    if (ethereumJSTopics.length !== rethnetTopics.length) {
      console.trace(
        `Different log[${logIdx}] topics length: ${ethereumJSTopics.length} (ethereumjs) !== ${rethnetTopics.length} (rethnet)`
      );
      differences.push("topics length");
    }

    for (let topicIdx = 0; topicIdx < ethereumJSTopics.length; ++topicIdx) {
      if (!ethereumJSTopics[topicIdx].equals(rethnetTopics[topicIdx])) {
        console.trace(
          `Different log[${logIdx}] topic[${topicIdx}]: ${ethereumJSTopics[topicIdx]} (ethereumjs) !== ${rethnetTopics[topicIdx]} (rethnet)`
        );
        differences.push("topic");
      }
    }

    if (!ethereumJSLogs[logIdx][2].equals(rethnetLogs[logIdx][2])) {
      console.trace(
        `Different log[${logIdx}] data: ${ethereumJSLogs[logIdx][2]} (ethereumjs) !== ${rethnetLogs[logIdx][2]} (rethnet)`
      );
      differences.push("data");
    }
  }

  if (differences.length !== 0) {
    throw new Error(`Different log fields: ${differences}`);
  }
}

function assertEqualAccounts(
  address: Address,
  ethereumJSAccount: Account,
  rethnetAccount: Account
) {
  const differences: string[] = [];

  if (ethereumJSAccount.balance !== rethnetAccount.balance) {
    console.trace(`Account: ${address}`);
    console.trace(
      `Different balance: ${ethereumJSAccount.balance} (ethereumjs) !== ${rethnetAccount.balance} (rethnet)`
    );
    differences.push("balance");
  }

  if (!ethereumJSAccount.codeHash.equals(rethnetAccount.codeHash)) {
    console.trace(
      `Different codeHash: ${ethereumJSAccount.codeHash} !== ${rethnetAccount.codeHash}`
    );
    differences.push("codeHash");
  }

  if (ethereumJSAccount.nonce !== rethnetAccount.nonce) {
    console.trace(
      `Different nonce: ${ethereumJSAccount.nonce} !== ${rethnetAccount.nonce}`
    );
    differences.push("nonce");
  }

  if (!ethereumJSAccount.storageRoot.equals(rethnetAccount.storageRoot)) {
    console.trace(
      `Different storageRoot: ${ethereumJSAccount.storageRoot.toString(
        "hex"
      )} !== ${rethnetAccount.storageRoot.toString("hex")}`
    );
    throw new Error("Different storageRoot");
  }
}

function traceDifferences(
  ethereumJSTrace: MessageTrace,
  rethnetTrace: MessageTrace
): string[] {
  const differences: string[] = [];

  // both traces are defined
  if (ethereumJSTrace.depth !== rethnetTrace.depth) {
    console.log(
      `Different depth: ${ethereumJSTrace.depth} !== ${rethnetTrace.depth}`
    );
    differences.push("depth");
  }

  if (ethereumJSTrace.exit.kind !== rethnetTrace.exit.kind) {
    console.log(
      `Different exit: ${ethereumJSTrace.exit.kind} !== ${rethnetTrace.exit.kind}`
    );
    differences.push("exit");
  }

  if (ethereumJSTrace.gasUsed !== rethnetTrace.gasUsed) {
    console.log(
      `Different gasUsed: ${ethereumJSTrace.gasUsed} !== ${rethnetTrace.gasUsed}`
    );
    differences.push("gasUsed");
  }

  if (!ethereumJSTrace.returnData.equals(rethnetTrace.returnData)) {
    console.log(
      `Different returnData: ${ethereumJSTrace.returnData} !== ${rethnetTrace.returnData}`
    );
    differences.push("returnData");
  }

  if (ethereumJSTrace.value !== rethnetTrace.value) {
    console.log(
      `Different value: ${ethereumJSTrace.value} !== ${rethnetTrace.value}`
    );
    differences.push("value");
  }

  if (isPrecompileTrace(ethereumJSTrace)) {
    if (!isPrecompileTrace(rethnetTrace)) {
      throw new Error(
        `ethereumJSTrace is a precompiled trace but rethnetTrace is not`
      );
    }

    // Both traces are precompile traces
    if (ethereumJSTrace.precompile !== rethnetTrace.precompile) {
      console.log(
        `Different precompile: ${ethereumJSTrace.precompile} !== ${rethnetTrace.precompile}`
      );
      differences.push("precompile");
    }

    if (!ethereumJSTrace.calldata.equals(rethnetTrace.calldata)) {
      console.log(
        `Different calldata: ${ethereumJSTrace.calldata} !== ${rethnetTrace.calldata}`
      );
      differences.push("calldata");
    }
  } else {
    if (isPrecompileTrace(rethnetTrace)) {
      throw new Error(
        `rethnetTrace is a precompiled trace but ethereumJSTrace is not`
      );
    }

    // Both traces are NOT precompile traces
    if (!ethereumJSTrace.code.equals(rethnetTrace.code)) {
      console.log(
        `Different code: ${ethereumJSTrace.code.toString(
          "hex"
        )} (ethereumjs) !== ${rethnetTrace.code.toString("hex")} (rethnet)`
      );
      differences.push("code");
    }

    if (ethereumJSTrace.steps.length !== rethnetTrace.steps.length) {
      console.log(
        `Different steps length: ${ethereumJSTrace.steps.length} !== ${rethnetTrace.steps.length}`
      );
      differences.push("steps.length");
    }

    for (let stepIdx = 0; stepIdx < ethereumJSTrace.steps.length; stepIdx++) {
      const ethereumJSStep = ethereumJSTrace.steps[stepIdx];
      const rethnetStep = rethnetTrace.steps[stepIdx];

      const stepDifferences: string[] = [];

      if (isEvmStep(ethereumJSStep)) {
        // if (stepIdx >= rethnetTrace.steps.length) {
        //   console.log("code:", ethereumJSTrace.code);
        //   console.log(stepIdx);
        //   console.log(ethereumJSStep);
        //   console.log("opcode:", ethereumJSTrace.code[ethereumJSStep.pc]);
        //   continue;
        // }

        if (!isEvmStep(rethnetStep)) {
          throw new Error(
            `ethereumJSStep '${stepIdx}' is an EVM step but rethnetStep '${stepIdx}' is not`
          );
        }

        if (ethereumJSStep.pc !== rethnetStep.pc) {
          console.log(
            `Different step[${stepIdx}] pc: ${ethereumJSStep.pc} !== ${rethnetStep.pc}`
          );
          stepDifferences.push("pc");
        }
      } else {
        if (isEvmStep(rethnetStep)) {
          throw new Error(
            `rethnetStep '${stepIdx}' is an EVM step but ethereumJSStep '${stepIdx}' is not`
          );
        }

        const messageDifferences = traceDifferences(
          ethereumJSStep,
          rethnetStep
        );

        if (messageDifferences.length > 0) {
          stepDifferences.push(`message: ${messageDifferences}`);
        }
      }

      if (stepDifferences.length > 0) {
        differences.push(`step[${stepIdx}]: ${stepDifferences}`);
      }
    }

    if (ethereumJSTrace.bytecode === undefined) {
      if (rethnetTrace.bytecode !== undefined) {
        console.log(
          "ethereumJSTrace.bytecode is undefined but rethnetTrace.bytecode is defined"
        );
        differences.push("bytecode");
      }
    } else {
      if (rethnetTrace.bytecode === undefined) {
        throw new Error(
          "ethereumJSTrace.bytecode is defined but rethnetTrace.bytecode is undefined"
        );
      }

      // Both traces contain bytecode
      if (!ethereumJSTrace.bytecode.equals(rethnetTrace.bytecode)) {
        console.log(
          `Different bytecode: ${ethereumJSTrace.bytecode} !== ${rethnetTrace.bytecode}`
        );
        differences.push("bytecode");
      }
    }

    if (ethereumJSTrace.numberOfSubtraces !== rethnetTrace.numberOfSubtraces) {
      console.log(
        `Different numberOfSubtraces: ${ethereumJSTrace.numberOfSubtraces} !== ${rethnetTrace.numberOfSubtraces}`
      );
      differences.push("numberOfSubtraces");
    }
  }

  return differences;
}
