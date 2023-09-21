import { Block } from "@nomicfoundation/ethereumjs-block";
import { Common } from "@nomicfoundation/ethereumjs-common";
import { TypedTransaction } from "@nomicfoundation/ethereumjs-tx";
import {
  BlockBuilder,
  Blockchain,
  PendingTransaction,
  State,
} from "rethnet-evm";
import { BlockBuilderAdapter, BuildBlockOpts, Reward } from "../block-builder";
import { RunTxResult } from "../vm-adapter";
import { RethnetStateManager } from "../../RethnetState";
import {
  ethereumjsBlockHeaderToRethnet,
  ethereumjsHeaderDataToRethnetBlockOptions,
  ethereumjsTransactionToRethnetSignedTransaction,
  ethereumsjsHardforkToRethnetSpecId,
  rethnetBlockToEthereumJS,
  rethnetResultToRunTxResult,
} from "../../utils/convertToRethnet";
import { VMTracer } from "../../../stack-traces/vm-tracer";
import { getHardforkName } from "../../../../util/hardforks";
import { makeConfigOptions } from "../rethnet";

export class RethnetBlockBuilder implements BlockBuilderAdapter {
  constructor(
    private readonly _blockBuilder: BlockBuilder,
    private readonly _blockState: State,
    private _originalStateManager: RethnetStateManager,
    private readonly _vmTracer: VMTracer,
    private _common: Common
  ) {}

  public static async create(
    blockchain: Blockchain,
    state: RethnetStateManager,
    vmTracer: VMTracer,
    common: Common,
    opts: BuildBlockOpts,
    limitContractCodeSize: bigint | null
  ): Promise<RethnetBlockBuilder> {
    const clonedState = await state.asInner().deepClone();

    const blockBuilder = await BlockBuilder.create(
      blockchain,
      clonedState,
      makeConfigOptions(common, false, true, limitContractCodeSize),
      ethereumjsBlockHeaderToRethnet(opts.parentBlock.header),
      ethereumjsHeaderDataToRethnetBlockOptions(opts.headerData)
    );

    return new RethnetBlockBuilder(
      blockBuilder,
      clonedState,
      state,
      vmTracer,
      common
    );
  }

  public async addTransaction(tx: TypedTransaction): Promise<RunTxResult> {
    const rethnetTx = ethereumjsTransactionToRethnetSignedTransaction(tx);
    const specId = ethereumsjsHardforkToRethnetSpecId(
      getHardforkName(tx.common.hardfork())
    );

    const rethnetResult = await this._blockBuilder.addTransaction(
      await PendingTransaction.create(
        this._blockState,
        specId,
        rethnetTx,
        tx.getSenderAddress().buf
      ),
      true
    );

    const trace = rethnetResult.trace!;
    for (const traceItem of trace) {
      if ("pc" in traceItem) {
        await this._vmTracer.addStep(traceItem);
      } else if ("executionResult" in traceItem) {
        await this._vmTracer.addAfterMessage(traceItem);
      } else {
        await this._vmTracer.addBeforeMessage(traceItem);
      }
    }

    const cumulativeBlockGasUsed = await this.getGasUsed();
    return rethnetResultToRunTxResult(
      rethnetResult.result,
      cumulativeBlockGasUsed
    );
  }

  public async finalize(rewards: Reward[], timestamp?: bigint): Promise<Block> {
    const block = await this._blockBuilder.finalize(
      rewards.map(([address, reward]) => {
        return [address.buf, reward];
      }),
      timestamp
    );

    this._originalStateManager.setInner(this._blockState);

    return rethnetBlockToEthereumJS(block, this._common);
  }

  public async revert(): Promise<void> {}

  public async getGasUsed(): Promise<bigint> {
    return this._blockBuilder.gasUsed;
  }
}
