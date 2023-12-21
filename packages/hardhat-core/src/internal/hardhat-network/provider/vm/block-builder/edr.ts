import { Block } from "@nomicfoundation/ethereumjs-block";
import { Common } from "@nomicfoundation/ethereumjs-common";
import { TypedTransaction } from "@nomicfoundation/ethereumjs-tx";
import {
  BlockBuilder,
  Blockchain,
  ConfigOptions,
  PendingTransaction,
  State,
} from "@ignored/edr";
import { BlockBuilderAdapter, BuildBlockOpts, Reward } from "../block-builder";
import { RunTxResult } from "../vm-adapter";
import { EdrStateManager } from "../../EdrState";
import {
  ethereumjsBlockHeaderToEdr,
  ethereumjsHeaderDataToEdrBlockOptions,
  ethereumjsTransactionToEdrSignedTransaction,
  ethereumsjsHardforkToEdrSpecId,
  edrBlockToEthereumJS,
  edrResultToRunTxResult,
} from "../../utils/convertToEdr";
import { VMTracer } from "../../../stack-traces/vm-tracer";
import { getHardforkName } from "../../../../util/hardforks";

export class EdrBlockBuilder implements BlockBuilderAdapter {
  constructor(
    private readonly _blockBuilder: BlockBuilder,
    private readonly _blockState: State,
    private _originalStateManager: EdrStateManager,
    private readonly _vmTracer: VMTracer,
    private _common: Common
  ) {}

  public static async create(
    blockchain: Blockchain,
    state: EdrStateManager,
    vmTracer: VMTracer,
    common: Common,
    opts: BuildBlockOpts,
    limitContractCodeSize: bigint | undefined
  ): Promise<EdrBlockBuilder> {
    const clonedState = await state.asInner().deepClone();

    const specId = await blockchain.specId();
    const config: ConfigOptions = {
      chainId: common.chainId(),
      specId,
      limitContractCodeSize,
      disableBlockGasLimit: false,
      disableEip3607: true,
    };

    const blockBuilder = new BlockBuilder(
      blockchain,
      clonedState,
      config,
      ethereumjsBlockHeaderToEdr(opts.parentBlock.header),
      ethereumjsHeaderDataToEdrBlockOptions(opts.headerData)
    );

    return new EdrBlockBuilder(
      blockBuilder,
      clonedState,
      state,
      vmTracer,
      common
    );
  }

  public async addTransaction(tx: TypedTransaction): Promise<RunTxResult> {
    const edrTx = ethereumjsTransactionToEdrSignedTransaction(tx);
    const specId = ethereumsjsHardforkToEdrSpecId(
      getHardforkName(tx.common.hardfork())
    );

    const edrResult = await this._blockBuilder.addTransaction(
      await PendingTransaction.create(specId, edrTx, tx.getSenderAddress().buf),
      true
    );

    const trace = edrResult.trace!;
    for (const traceItem of trace) {
      if ("pc" in traceItem) {
        await this._vmTracer.addStep(traceItem);
      } else if ("executionResult" in traceItem) {
        await this._vmTracer.addAfterMessage(traceItem.executionResult);
      } else {
        await this._vmTracer.addBeforeMessage(traceItem);
      }
    }

    const cumulativeBlockGasUsed = await this.getGasUsed();
    return edrResultToRunTxResult(edrResult.result, cumulativeBlockGasUsed);
  }

  public async finalize(rewards: Reward[], timestamp?: bigint): Promise<Block> {
    const block = await this._blockBuilder.finalize(
      rewards.map(([address, reward]) => {
        return [address.buf, reward];
      }),
      timestamp
    );

    this._originalStateManager.setInner(this._blockState);

    return edrBlockToEthereumJS(block, this._common);
  }

  public async revert(): Promise<void> {
    // EDR is stateless, so we don't need to revert anything
  }

  public async getGasUsed(): Promise<bigint> {
    return this._blockBuilder.gasUsed;
  }
}
