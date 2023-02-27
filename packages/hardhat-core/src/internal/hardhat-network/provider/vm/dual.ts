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
import { VMTracer } from "../../stack-traces/vm-tracer";
import { isForkedNodeConfig, NodeConfig } from "../node-types";
import { RpcDebugTraceOutput } from "../output";
import { HardhatBlockchainInterface } from "../types/HardhatBlockchainInterface";

import { EthereumJSAdapter } from "./ethereumjs";
import { ExitCode } from "./exit";
import { RethnetAdapter } from "./rethnet";
import { RunTxResult, Trace, VMAdapter } from "./vm-adapter";

/* eslint-disable @nomiclabs/hardhat-internal-rules/only-hardhat-error */
/* eslint-disable @typescript-eslint/restrict-template-expressions */

function _printEthereumJSTrace(trace: any) {
  console.log(JSON.stringify(trace, null, 2));
}

function _printRethnetTrace(trace: any) {
  console.log(
    JSON.stringify(
      trace,
      function (key, value) {
        if (key === "op") {
          switch (value) {
            case 0x0:
              return "STOP";
            case 0x1:
              return "ADD";
            case 0x2:
              return "MUL";
            case 0x3:
              return "SUB";
            case 0x4:
              return "DIV";
            case 0x5:
              return "SDIV";
            case 0x6:
              return "MOD";
            case 0x7:
              return "SMOD";
            case 0x8:
              return "ADDMOD";
            case 0x9:
              return "MULMOD";
            case 0x0a:
              return "EXP";
            case 0x0b:
              return "SIGNEXTEND";
            case 0x10:
              return "LT";
            case 0x11:
              return "GT";
            case 0x12:
              return "SLT";
            case 0x13:
              return "SGT";
            case 0x14:
              return "EQ";
            case 0x15:
              return "ISZERO";
            case 0x16:
              return "AND";
            case 0x17:
              return "OR";
            case 0x18:
              return "XOR";
            case 0x19:
              return "NOT";
            case 0x1a:
              return "BYTE";
            case 0x1b:
              return "SHL";
            case 0x1c:
              return "SHR";
            case 0x1d:
              return "SAR";
            case 0x20:
              return "KECCAK256";
            case 0x30:
              return "ADDRESS";
            case 0x31:
              return "BALANCE";
            case 0x32:
              return "ORIGIN";
            case 0x33:
              return "CALLER";
            case 0x34:
              return "CALLVALUE";
            case 0x35:
              return "CALLDATALOAD";
            case 0x36:
              return "CALLDATASIZE";
            case 0x37:
              return "CALLDATACOPY";
            case 0x38:
              return "CODESIZE";
            case 0x39:
              return "CODECOPY";
            case 0x3a:
              return "GASPRICE";
            case 0x3b:
              return "EXTCODESIZE";
            case 0x3c:
              return "EXTCODECOPY";
            case 0x3d:
              return "RETURNDATASIZE";
            case 0x3e:
              return "RETURNDATACOPY";
            case 0x3f:
              return "EXTCODEHASH";
            case 0x40:
              return "BLOCKHASH";
            case 0x41:
              return "COINBASE";
            case 0x42:
              return "TIMESTAMP";
            case 0x43:
              return "NUMBER";
            case 0x44:
              return "PREVRANDAO";
            case 0x45:
              return "GASLIMIT";
            case 0x46:
              return "CHAINID";
            case 0x47:
              return "SELFBALANCE";
            case 0x48:
              return "BASEFEE";
            case 0x50:
              return "POP";
            case 0x51:
              return "MLOAD";
            case 0x52:
              return "MSTORE";
            case 0x53:
              return "MSTORE8";
            case 0x54:
              return "SLOAD";
            case 0x55:
              return "SSTORE";
            case 0x56:
              return "JUMP";
            case 0x57:
              return "JUMPI";
            case 0x58:
              return "PC";
            case 0x59:
              return "MSIZE";
            case 0x5a:
              return "GAS";
            case 0x5b:
              return "JUMPDEST";
            case 0x60:
              return "PUSH1";
            case 0x61:
              return "PUSH2";
            case 0x62:
              return "PUSH3";
            case 0x63:
              return "PUSH4";
            case 0x64:
              return "PUSH5";
            case 0x65:
              return "PUSH6";
            case 0x66:
              return "PUSH7";
            case 0x67:
              return "PUSH8";
            case 0x68:
              return "PUSH9";
            case 0x69:
              return "PUSH10";
            case 0x6a:
              return "PUSH11";
            case 0x6b:
              return "PUSH12";
            case 0x6c:
              return "PUSH13";
            case 0x6d:
              return "PUSH14";
            case 0x6e:
              return "PUSH15";
            case 0x6f:
              return "PUSH16";
            case 0x70:
              return "PUSH17";
            case 0x71:
              return "PUSH18";
            case 0x72:
              return "PUSH19";
            case 0x73:
              return "PUSH20";
            case 0x74:
              return "PUSH21";
            case 0x75:
              return "PUSH22";
            case 0x76:
              return "PUSH23";
            case 0x77:
              return "PUSH24";
            case 0x78:
              return "PUSH25";
            case 0x79:
              return "PUSH26";
            case 0x7a:
              return "PUSH27";
            case 0x7b:
              return "PUSH28";
            case 0x7c:
              return "PUSH29";
            case 0x7d:
              return "PUSH30";
            case 0x7e:
              return "PUSH31";
            case 0x7f:
              return "PUSH32";
            case 0x80:
              return "DUP1";
            case 0x81:
              return "DUP2";
            case 0x82:
              return "DUP3";
            case 0x83:
              return "DUP4";
            case 0x84:
              return "DUP5";
            case 0x85:
              return "DUP6";
            case 0x86:
              return "DUP7";
            case 0x87:
              return "DUP8";
            case 0x88:
              return "DUP9";
            case 0x89:
              return "DUP10";
            case 0x8a:
              return "DUP11";
            case 0x8b:
              return "DUP12";
            case 0x8c:
              return "DUP13";
            case 0x8d:
              return "DUP14";
            case 0x8e:
              return "DUP15";
            case 0x8f:
              return "DUP16";
            case 0x90:
              return "SWAP1";
            case 0x91:
              return "SWAP2";
            case 0x92:
              return "SWAP3";
            case 0x93:
              return "SWAP4";
            case 0x94:
              return "SWAP5";
            case 0x95:
              return "SWAP6";
            case 0x96:
              return "SWAP7";
            case 0x97:
              return "SWAP8";
            case 0x98:
              return "SWAP9";
            case 0x99:
              return "SWAP10";
            case 0x9a:
              return "SWAP11";
            case 0x9b:
              return "SWAP12";
            case 0x9c:
              return "SWAP13";
            case 0x9d:
              return "SWAP14";
            case 0x9e:
              return "SWAP15";
            case 0x9f:
              return "SWAP16";
            case 0xa0:
              return "LOG0";
            case 0xa1:
              return "LOG1";
            case 0xa2:
              return "LOG2";
            case 0xa3:
              return "LOG3";
            case 0xa4:
              return "LOG4";
            case 0xf0:
              return "CREATE";
            case 0xf1:
              return "CALL";
            case 0xf2:
              return "CALLCODE";
            case 0xf3:
              return "RETURN";
            case 0xf4:
              return "DELEGATECALL";
            case 0xf5:
              return "CREATE2";
            case 0xfa:
              return "STATICCALL";
            case 0xfd:
              return "REVERT";
            case 0xfe:
              return "INVALID";
            case 0xff:
              return "SELFDESTRUCT";
          }
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
    const ethereumJSResultPromise = this._ethereumJSAdapter.runTxInBlock(
      tx,
      block
    );

    const rethnetResultPromise = this._rethnetAdapter.runTxInBlock(tx, block);

    const [
      [ethereumJSResult, ethereumJSTrace],
      [rethnetResult, _rethnetTrace],
    ] = await Promise.all([ethereumJSResultPromise, rethnetResultPromise]);

    try {
      assertEqualRunTxResults(ethereumJSResult, rethnetResult);

      return [ethereumJSResult, ethereumJSTrace];
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
        )} (ethereumjs) !== ${rethnetRoot.toString("hex")} (rethnet)`
      );
      throw new Error("Different snapshot state root");
    }

    return rethnetRoot;
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

      assertEqualTraces(ethereumJSTrace, rethnetTrace);
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

      if (ethereumJSStep.opcode !== rethnetStep.opcode) {
        console.trace(
          `Different steps[${stepIdx}] opcode: ${ethereumJSStep.opcode} (ethereumjs) !== ${rethnetStep.opcode} (rethnet)`
        );
        throw new Error("Different step opcode");
      }

      if (ethereumJSStep.gasCost !== rethnetStep.gasCost) {
        console.trace(
          `Different steps[${stepIdx}] gasCost: ${ethereumJSStep.gasCost} (ethereumjs) !== ${rethnetStep.gasCost} (rethnet)`
        );
        throw new Error("Different step gasCost");
      }

      if (ethereumJSStep.gasLeft !== rethnetStep.gasLeft) {
        console.trace(
          `Different steps[${stepIdx}] gasLeft: ${ethereumJSStep.gasLeft} (ethereumjs) !== ${rethnetStep.gasLeft} (rethnet)`
        );
        throw new Error("Different step gasLeft");
      }

      const ethereumJSStack = ethereumJSStep.stack;
      const rethnetStack = rethnetStep.stack;
      if (ethereumJSStack.length !== rethnetStack.length) {
        throw new Error(
          `Different number of stack elements in tracers: ${ethereumJSStack.length} (ethereumjs) !== ${rethnetStack.length} (rethnet)`
        );
      }

      for (let stackIdx = 0; stackIdx < ethereumJSSteps.length; ++stackIdx) {
        const ethereumJSStackElement = ethereumJSStack[stackIdx];
        const rethnetStackElement = rethnetStack[stackIdx];

        if (ethereumJSStackElement !== rethnetStackElement) {
          console.trace(
            `Different steps[${stepIdx}] stack[${stackIdx}]: ${ethereumJSStackElement} (ethereumjs) !== ${rethnetStackElement} (rethnet)`
          );
          throw new Error("Different step stack element");
        }
      }

      if (!ethereumJSStep.memory.equals(rethnetStep.memory)) {
        console.trace(
          `Different steps[${stepIdx}] memory: ${ethereumJSStep.memory} (ethereumjs) !== ${rethnetStep.memory} (rethnet)`
        );
        throw new Error("Different step memory");
      }

      if (ethereumJSStep.contract.balance !== rethnetStep.contract.balance) {
        console.trace(
          `Different steps[${stepIdx}] contract balance: ${ethereumJSStep.contract.balance} (ethereumjs) !== ${rethnetStep.contract.balance} (rethnet)`
        );
        throw new Error("Different step contract balance");
      }

      if (ethereumJSStep.contract.nonce !== rethnetStep.contract.nonce) {
        console.trace(
          `Different steps[${stepIdx}] contract nonce: ${ethereumJSStep.contract.nonce} (ethereumjs) !== ${rethnetStep.contract.nonce} (rethnet)`
        );
        throw new Error("Different step contract nonce");
      }

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

      if (!ethereumJSStep.contractAddress.equals(rethnetStep.contractAddress)) {
        console.trace(
          `Different steps[${stepIdx}] contract address: ${ethereumJSStep.contractAddress} (ethereumjs) !== ${rethnetStep.contractAddress} (rethnet)`
        );
        throw new Error("Different step contract address");
      }
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
        `Different codeHash: ${bufferToHex(
          ethereumJSAccount.codeHash
      )} (ethereumjs) !== ${bufferToHex(rethnetAccount.codeHash)} (rethnet)`
    );
    differences.push("codeHash");
  }

  if (ethereumJSAccount.nonce !== rethnetAccount.nonce) {
    console.trace(
      `Different nonce: ${ethereumJSAccount.nonce} (ethereumjs) !== ${rethnetAccount.nonce} (rethnet)`
    );
    differences.push("nonce");
  }

  if (!ethereumJSAccount.storageRoot.equals(rethnetAccount.storageRoot)) {
    // TODO re-enable
    // console.trace(
    //   `Different storageRoot: ${ethereumJSAccount.storageRoot.toString(
    //     "hex"
    //   )} !== ${rethnetAccount.storageRoot.toString("hex")}`
    // );
    // throw new Error("Different storageRoot");
  }
}

function assertEqualTraces(
  ethereumJSTrace: MessageTrace,
  rethnetTrace: MessageTrace
) {
  // both traces are defined
  if (ethereumJSTrace.depth !== rethnetTrace.depth) {
    throw new Error(
      `Different depth: ${ethereumJSTrace.depth} (ethereumjs) !== ${rethnetTrace.depth} (rethnet)`
    );
  }

  if (ethereumJSTrace.exit.kind !== rethnetTrace.exit.kind) {
    throw new Error(
      `Different exit: ${ethereumJSTrace.exit.kind} (ethereumjs) !== ${rethnetTrace.exit.kind} (rethnet)`
    );
  }

  if (ethereumJSTrace.gasUsed !== rethnetTrace.gasUsed) {
    throw new Error(
      `Different gasUsed: ${ethereumJSTrace.gasUsed} (ethereumjs) !== ${rethnetTrace.gasUsed} (rethnet)`
    );
  }

  if (!ethereumJSTrace.returnData.equals(rethnetTrace.returnData)) {
    throw new Error(
      `Different returnData: ${ethereumJSTrace.returnData} (ethereumjs) !== ${rethnetTrace.returnData} (rethnet)`
    );
  }

  if (ethereumJSTrace.value !== rethnetTrace.value) {
    throw new Error(
      `Different value: ${ethereumJSTrace.value} (ethereumjs) !== ${rethnetTrace.value} (rethnet)`
    );
  }

  if (isPrecompileTrace(ethereumJSTrace)) {
    if (!isPrecompileTrace(rethnetTrace)) {
      throw new Error(
        `ethereumJSTrace is a precompiled trace but rethnetTrace is not`
      );
    }

    // Both traces are precompile traces
    if (ethereumJSTrace.precompile !== rethnetTrace.precompile) {
      throw new Error(
        `Different precompile: ${ethereumJSTrace.precompile} (ethereumjs) !== ${rethnetTrace.precompile} (rethnet)`
      );
    }

    if (!ethereumJSTrace.calldata.equals(rethnetTrace.calldata)) {
      throw new Error(
        `Different calldata: ${ethereumJSTrace.calldata} (ethereumjs) !== ${rethnetTrace.calldata} (rethnet)`
      );
    }
  } else {
    if (isPrecompileTrace(rethnetTrace)) {
      throw new Error(
        `ethereumJSTrace is a precompiled trace but ethereumJSTrace is not`
      );
    }

    // Both traces are NOT precompile traces
    if (!ethereumJSTrace.code.equals(rethnetTrace.code)) {
      console.log("ethereumjs:", ethereumJSTrace);
      console.log("rethnet:", rethnetTrace);
      throw new Error(
        `Different code: ${ethereumJSTrace.code.toString(
          "hex"
        )} (ethereumjs) !== ${rethnetTrace.code.toString("hex")} (rethnet)`
      );
    }

    if (ethereumJSTrace.steps.length !== rethnetTrace.steps.length) {
      throw new Error(
        `Different steps length: ${ethereumJSTrace.steps.length} (ethereumjs) !== ${rethnetTrace.steps.length} (rethnet)`
      );
    }

    for (let stepIdx = 0; stepIdx < ethereumJSTrace.steps.length; stepIdx++) {
      const ethereumJSStep = ethereumJSTrace.steps[stepIdx];
      const rethnetStep = rethnetTrace.steps[stepIdx];

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
          throw new Error(
            `Different step[${stepIdx}]: ${ethereumJSStep.pc} (ethereumjs) !== ${rethnetStep.pc} (rethnet)`
          );
        }
      } else {
        if (isEvmStep(rethnetStep)) {
          throw new Error(
            `rethnetStep '${stepIdx}' is an EVM step but ethereumJSStep '${stepIdx}' is not`
          );
        }

        assertEqualTraces(ethereumJSStep, rethnetStep);
      }
    }

    if (ethereumJSTrace.bytecode === undefined) {
      if (rethnetTrace.bytecode !== undefined) {
        throw new Error(
          "ethereumJSTrace.bytecode is undefined but rethnetTrace.bytecode is defined"
        );
      }
    } else {
      if (rethnetTrace.bytecode === undefined) {
        throw new Error(
          "ethereumJSTrace.bytecode is defined but rethnetTrace.bytecode is undefined"
        );
      }

      // Both traces contain bytecode
      if (!ethereumJSTrace.bytecode.equals(rethnetTrace.bytecode)) {
        throw new Error(
          `Different bytecode: ${ethereumJSTrace.bytecode} (ethereumjs) !== ${rethnetTrace.bytecode} (rethnet)`
        );
      }
    }

    if (ethereumJSTrace.numberOfSubtraces !== rethnetTrace.numberOfSubtraces) {
      throw new Error(
        `Different numberOfSubtraces: ${ethereumJSTrace.numberOfSubtraces} (ethereumjs) !== ${rethnetTrace.numberOfSubtraces} (rethnet)`
      );
    }
  }
}
