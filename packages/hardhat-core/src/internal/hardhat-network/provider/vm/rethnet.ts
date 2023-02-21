import { Block } from "@nomicfoundation/ethereumjs-block";
import { Common } from "@nomicfoundation/ethereumjs-common";
import {
  Account,
  Address,
  KECCAK256_NULL,
} from "@nomicfoundation/ethereumjs-util";
import { TypedTransaction } from "@nomicfoundation/ethereumjs-tx";
import {
  Account as RethnetAccount,
  BlockBuilder,
  Blockchain,
  Bytecode,
  Rethnet,
  Tracer,
  TracingMessage,
  TracingMessageResult,
  TracingStep,
} from "rethnet-evm";

import { isForkedNodeConfig, NodeConfig } from "../node-types";
import {
  ethereumjsHeaderDataToRethnet,
  ethereumjsTransactionToRethnet,
  ethereumsjsHardforkToRethnet,
  rethnetResultToRunTxResult,
} from "../utils/convertToRethnet";
import { hardforkGte, HardforkName } from "../../../util/hardforks";
import { keccak256 } from "../../../util/keccak";
import { RpcDebugTraceOutput } from "../output";
import { RethnetStateManager } from "../RethnetState";
import { RpcDebugTracingConfig } from "../../../core/jsonrpc/types/input/debugTraceTransaction";
import { MessageTrace } from "../../stack-traces/message-trace";
import { VMTracer } from "../../stack-traces/vm-tracer";

import { RunTxResult, Trace, VMAdapter } from "./vm-adapter";

/* eslint-disable @nomiclabs/hardhat-internal-rules/only-hardhat-error */
/* eslint-disable @typescript-eslint/no-unused-vars */

export class RethnetAdapter implements VMAdapter {
  private _vmTracer: VMTracer;

  constructor(
    private _blockchain: Blockchain,
    private _state: RethnetStateManager,
    private _rethnet: Rethnet,
    private readonly _selectHardfork: (blockNumber: bigint) => string,
    common: Common
  ) {
    this._vmTracer = new VMTracer(common, false);
  }

  public static async create(
    config: NodeConfig,
    selectHardfork: (blockNumber: bigint) => string,
    getBlockHash: (blockNumber: bigint) => Promise<Buffer>,
    common: Common
  ): Promise<RethnetAdapter> {
    if (isForkedNodeConfig(config)) {
      // eslint-disable-next-line @nomiclabs/hardhat-internal-rules/only-hardhat-error
      throw new Error("Forking is not supported for Rethnet yet");
    }

    const blockchain = new Blockchain(getBlockHash);

    const limitContractCodeSize =
      config.allowUnlimitedContractSize === true ? 2n ** 64n - 1n : undefined;

    const state = RethnetStateManager.withGenesisAccounts(
      config.genesisAccounts
    );

    const rethnet = new Rethnet(blockchain, state.asInner(), {
      chainId: BigInt(config.chainId),
      specId: ethereumsjsHardforkToRethnet(config.hardfork as HardforkName),
      limitContractCodeSize,
      disableBlockGasLimit: true,
      disableEip3607: true,
    });

    return new RethnetAdapter(
      blockchain,
      state,
      rethnet,
      selectHardfork,
      common
    );
  }

  /**
   * Run `tx` with the given `blockContext`, without modifying the state.
   */
  public async dryRun(
    tx: TypedTransaction,
    blockContext: Block,
    forceBaseFeeZero?: boolean
  ): Promise<[RunTxResult, Trace]> {
    const rethnetTx = ethereumjsTransactionToRethnet(tx);

    const difficulty = this._getBlockEnvDifficulty(
      blockContext.header.difficulty
    );

    const prevRandao = this._getBlockPrevRandao(
      blockContext.header.number,
      blockContext.header.mixHash
    );

    const tracer = new Tracer({
      beforeMessage: this._beforeMessageHandler,
      step: this._stepHandler,
      afterMessage: this._afterMessageHandler,
    });

    const rethnetResult = await this._rethnet.guaranteedDryRun(
      rethnetTx,
      {
        number: blockContext.header.number,
        coinbase: blockContext.header.coinbase.buf,
        timestamp: blockContext.header.timestamp,
        basefee:
          forceBaseFeeZero === true ? 0n : blockContext.header.baseFeePerGas,
        gasLimit: blockContext.header.gasLimit,
        difficulty,
        prevrandao: prevRandao,
      },
      tracer
    );

    try {
      const result = rethnetResultToRunTxResult(
        rethnetResult.execResult,
        blockContext.header.gasUsed
      );
      return [result, rethnetResult.execResult.trace];
    } catch (e) {
      // console.log("Rethnet trace");
      // console.log(rethnetResult.execResult.trace);
      throw e;
    }
  }

  /**
   * Get the account info for the given address.
   */
  public async getAccount(address: Address): Promise<Account> {
    const account = await this._state.getAccount(address);
    const storageRoot = await this._state.getAccountStorageRoot(address);
    return new Account(
      account?.nonce,
      account?.balance,
      storageRoot ?? undefined,
      account?.code?.hash
    );
  }

  /**
   * Get the storage value at the given address and slot.
   */
  public async getContractStorage(
    address: Address,
    key: Buffer
  ): Promise<Buffer> {
    return this._state.getContractStorage(address, key);
  }

  /**
   * Get the contract code at the given address.
   */
  public async getContractCode(address: Address): Promise<Buffer> {
    return this._state.getContractCode(address);
  }

  /**
   * Update the account info for the given address.
   */
  public async putAccount(address: Address, account: Account): Promise<void> {
    const contractCode =
      account.codeHash === KECCAK256_NULL
        ? undefined
        : await this._state.getContractCode(address);

    return this._state.modifyAccount(
      address,
      async function (
        balance: bigint,
        nonce: bigint,
        code: Bytecode | undefined
      ): Promise<RethnetAccount> {
        const newCode: Bytecode | undefined =
          account.codeHash === KECCAK256_NULL
            ? undefined
            : account.codeHash === code?.hash
            ? code
            : {
                hash: account.codeHash,
                code: contractCode!,
              };

        return {
          balance: account.balance,
          nonce: account.nonce,
          code: newCode,
        };
      }
    );
  }

  /**
   * Update the contract code for the given address.
   */
  public async putContractCode(address: Address, value: Buffer): Promise<void> {
    const codeHash = keccak256(value);
    return this._state.modifyAccount(
      address,
      async function (
        balance: bigint,
        nonce: bigint,
        code: Bytecode | undefined
      ): Promise<RethnetAccount> {
        const newCode: Bytecode | undefined =
          codeHash === KECCAK256_NULL
            ? undefined
            : codeHash === code?.hash
            ? code
            : {
                hash: codeHash,
                code: value,
              };

        return {
          balance,
          nonce,
          code: newCode,
        };
      }
    );
  }

  /**
   * Update the value of the given storage slot.
   */
  public async putContractStorage(
    address: Address,
    key: Buffer,
    value: Buffer
  ): Promise<void> {
    await this._state.putContractStorage(address, key, value);
  }

  /**
   * Get the root of the current state trie.
   */
  public async getStateRoot(): Promise<Buffer> {
    return this._state.getStateRoot();
  }

  /**
   * Reset the state trie to the point after `block` was mined. If
   * `irregularStateOrUndefined` is passed, use it as the state root.
   */
  public async setBlockContext(
    block: Block,
    irregularStateOrUndefined: Buffer | undefined
  ): Promise<void> {
    return this._state.setStateRoot(
      irregularStateOrUndefined ?? block.header.stateRoot
    );
  }

  /**
   * Reset the state trie to the point where it had the given state root.
   *
   * Throw if it can't.
   */
  public async restoreContext(stateRoot: Buffer): Promise<void> {
    return this._state.setStateRoot(stateRoot);
  }

  /**
   * Start a new block and accept transactions sent with `runTxInBlock`.
   */
  public async startBlock(): Promise<void> {
    await this._state.checkpoint();
  }

  /**
   * Must be called after `startBlock`, and before `addBlockRewards`.
   */
  public async runTxInBlock(
    tx: TypedTransaction,
    block: Block
  ): Promise<[RunTxResult, Trace]> {
    const rethnetTx = ethereumjsTransactionToRethnet(tx);

    const difficulty = this._getBlockEnvDifficulty(block.header.difficulty);

    const prevRandao = this._getBlockPrevRandao(
      block.header.number,
      block.header.mixHash
    );

    const tracer = new Tracer({
      beforeMessage: this._beforeMessageHandler,
      step: this._stepHandler,
      afterMessage: this._afterMessageHandler,
    });

    const rethnetResult = await this._rethnet.run(
      rethnetTx,
      ethereumjsHeaderDataToRethnet(block.header, difficulty, prevRandao),
      tracer
    );

    try {
      const result = rethnetResultToRunTxResult(
        rethnetResult,
        block.header.gasUsed
      );
      return [result, rethnetResult.trace];
    } catch (e) {
      // console.log("Rethnet trace");
      // console.log(rethnetResult.trace);
      throw e;
    }
  }

  /**
   * Must be called after `startBlock` and all `runTxInBlock` calls.
   */
  public async addBlockRewards(
    rewards: Array<[Address, bigint]>
  ): Promise<void> {
    const blockBuilder = BlockBuilder.new(
      this._blockchain,
      this._state.asInner(),
      {},
      {
        // Dummy values
        parentHash: Buffer.alloc(32, 0),
        ommersHash: Buffer.alloc(32, 0),
        beneficiary: Buffer.alloc(20, 0),
        stateRoot: Buffer.alloc(32, 0),
        transactionsRoot: Buffer.alloc(32, 0),
        receiptsRoot: Buffer.alloc(32, 0),
        logsBloom: Buffer.alloc(256, 0),
        difficulty: 0n,
        number: 0n,
        gasLimit: 0n,
        gasUsed: 0n,
        timestamp: 0n,
        extraData: Buffer.allocUnsafe(0),
        mixHash: Buffer.alloc(32, 0),
        nonce: 0n,
      },
      {}
    );

    await blockBuilder.finalize(
      rewards.map(([address, reward]) => {
        return [address.buf, reward];
      })
    );
  }

  /**
   * Finish the block successfully. Must be called after `addBlockRewards`.
   */
  public async sealBlock(): Promise<void> {}

  /**
   * Revert the block and discard the changes to the state. Can be called
   * at any point after `startBlock`.
   */
  public async revertBlock(): Promise<void> {
    await this._state.revert();
  }

  /**
   * Re-execute the transactions in the block up until the transaction with the
   * given hash, and trace the execution of that transaction.
   */
  public async traceTransaction(
    hash: Buffer,
    block: Block,
    config: RpcDebugTracingConfig
  ): Promise<RpcDebugTraceOutput> {
    throw new Error("traceTransaction not implemented for Rethnet");
  }

  public async makeSnapshot(): Promise<Buffer> {
    return this._state.makeSnapshot();
  }

  public getLastTrace(): {
    trace: MessageTrace | undefined;
    error: Error | undefined;
  } {
    const trace = this._vmTracer.getLastTopLevelMessageTrace();
    const error = this._vmTracer.getLastError();

    return { trace, error };
  }

  public clearLastError() {
    this._vmTracer.clearLastError();
  }

  private _getBlockEnvDifficulty(
    difficulty: bigint | undefined
  ): bigint | undefined {
    const MAX_DIFFICULTY = 2n ** 32n - 1n;
    if (difficulty !== undefined && difficulty > MAX_DIFFICULTY) {
      console.debug(
        "Difficulty is larger than U256::max:",
        difficulty.toString(16)
      );
      return MAX_DIFFICULTY;
    }

    return difficulty;
  }

  private _getBlockPrevRandao(
    blockNumber: bigint,
    mixHash: Buffer | undefined
  ): Buffer | undefined {
    const hardfork = this._selectHardfork(blockNumber);
    const isPostMergeHardfork = hardforkGte(
      hardfork as HardforkName,
      HardforkName.MERGE
    );

    if (isPostMergeHardfork) {
      if (mixHash === undefined) {
        throw new Error("mixHash must be set for post-merge hardfork");
      }

      return mixHash;
    }

    return undefined;
  }

  private _beforeMessageHandler = async (
    message: TracingMessage,
    next: any
  ) => {
    await this._vmTracer.addBeforeMessage(message);
  };

  private _stepHandler = async (step: TracingStep, _next: any) => {
    await this._vmTracer.addStep(step);
  };

  private _afterMessageHandler = async (
    result: TracingMessageResult,
    _next: any
  ) => {
    await this._vmTracer.addAfterMessage(result);
  };
}
