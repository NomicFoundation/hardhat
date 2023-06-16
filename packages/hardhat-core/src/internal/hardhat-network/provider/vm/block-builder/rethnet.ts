import { Block } from "@nomicfoundation/ethereumjs-block";
import { Common } from "@nomicfoundation/ethereumjs-common";
import { TypedTransaction } from "@nomicfoundation/ethereumjs-tx";
import { BlockBuilder, Blockchain, Config } from "rethnet-evm";
import { BlockBuilderAdapter, BuildBlockOpts, Reward } from "../block-builder";
import { globalRethnetContext } from "../rethnet";
import { RunTxResult } from "../vm-adapter";
import { RethnetStateManager } from "../../RethnetState";
import {
  ethereumjsBlockHeaderToRethnet,
  ethereumjsHeaderDataToRethnetBlockOptions,
  ethereumjsTransactionToRethnetPendingTransaction,
  ethereumsjsHardforkToRethnet,
  rethnetBlockToEthereumJS,
  rethnetResultToRunTxResult,
} from "../../utils/convertToRethnet";
import { VMTracer } from "../../../stack-traces/vm-tracer";
import { HardforkName } from "../../../../util/hardforks";

export class RethnetBlockBuilder implements BlockBuilderAdapter {
  constructor(
    private _blockBuilder: BlockBuilder,
    private _vmTracer: VMTracer,
    private _common: Common
  ) {}

  public static async create(
    blockchain: Blockchain,
    state: RethnetStateManager,
    vmTracer: VMTracer,
    vmConfig: Config,
    common: Common,
    opts: BuildBlockOpts
  ): Promise<RethnetBlockBuilder> {
    const blockBuilder = await BlockBuilder.create(
      globalRethnetContext,
      blockchain,
      state.asInner(),
      {
        chainId: common.chainId(),
        specId: ethereumsjsHardforkToRethnet(common.hardfork() as HardforkName),
        limitContractCodeSize: vmConfig.limitContractCodeSize ?? undefined,
        disableBlockGasLimit: vmConfig.disableBlockGasLimit,
        disableEip3607: vmConfig.disableEip3607,
      },
      ethereumjsBlockHeaderToRethnet(opts.parentBlock.header),
      ethereumjsHeaderDataToRethnetBlockOptions(opts.headerData)
    );

    return new RethnetBlockBuilder(blockBuilder, vmTracer, common);
  }

  public async addTransaction(tx: TypedTransaction): Promise<RunTxResult> {
    const rethnetTx = ethereumjsTransactionToRethnetPendingTransaction(tx);

    const cumulativeBlockGasUsed = await this.getGasUsed();
    const rethnetResult = await this._blockBuilder.addTransaction(
      rethnetTx,
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

    return rethnetBlockToEthereumJS(block, this._common);
  }

  public async revert(): Promise<void> {
    await this._blockBuilder.abort();
  }

  public async getGasUsed(): Promise<bigint> {
    return this._blockBuilder.gasUsed;
  }
}
