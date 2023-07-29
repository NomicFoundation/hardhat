import { Common } from "@nomicfoundation/ethereumjs-common";
import { BlockMiner } from "rethnet-evm";
import { BlockMinerAdapter, PartialMineBlockResult } from "../miner";
import {
  rethnetBlockToEthereumJS,
  rethnetReceiptToEthereumJsTxReceipt,
  rethnetResultToRunTxResult,
} from "../utils/convertToRethnet";
import { VMTracer } from "../../stack-traces/vm-tracer";
import { PartialTrace } from "../vm/vm-adapter";

export class RethnetMiner implements BlockMinerAdapter {
  constructor(
    private readonly _miner: BlockMiner,
    private readonly _common: Common
  ) {}

  public async mineBlock(
    blockTimestamp: bigint,
    minerReward: bigint,
    baseFeePerGas?: bigint
  ): Promise<PartialMineBlockResult> {
    const mineResult = await this._miner.mineBlock(
      blockTimestamp,
      minerReward,
      baseFeePerGas
    );

    const traces: PartialTrace[] = [];

    const vmTracer = new VMTracer(this._common, false);

    for (const mineTrace of mineResult.traces) {
      for (const traceItem of mineTrace) {
        if ("pc" in traceItem) {
          await vmTracer.addStep(traceItem);
        } else if ("executionResult" in traceItem) {
          await vmTracer.addAfterMessage(traceItem);
        } else {
          await vmTracer.addBeforeMessage(traceItem);
        }

        const trace = vmTracer.getLastTopLevelMessageTrace();
        const error = vmTracer.getLastError();

        vmTracer.clearLastError();

        traces.push({ trace, error });
      }
    }

    const cumulativeBlockGasUsed = mineResult.block.header.gasUsed;

    return {
      block: rethnetBlockToEthereumJS(mineResult.block, this._common),
      blockResult: {
        results: mineResult.results.map((result, _index, _array) => {
          return rethnetResultToRunTxResult(result, cumulativeBlockGasUsed);
        }),
        receipts: mineResult.block.receipts.map((receipt, _index, _array) => {
          return rethnetReceiptToEthereumJsTxReceipt(receipt);
        }),
        stateRoot: mineResult.block.header.stateRoot,
        logsBloom: mineResult.block.header.logsBloom,
        receiptsRoot: mineResult.block.header.receiptsRoot,
        gasUsed: mineResult.block.header.gasUsed,
      },
      traces,
    };
  }

  public async mineBlocks(
    blockTimestamp: bigint,
    minerReward: bigint,
    count: bigint,
    interval: bigint,
    baseFeePerGas?: bigint
  ): Promise<PartialMineBlockResult[]> {
    const mineBlockResults: PartialMineBlockResult[] = [];

    for (let idx = 0; idx < count; ++idx) {
      mineBlockResults.push(
        await this.mineBlock(blockTimestamp, minerReward, baseFeePerGas)
      );

      blockTimestamp += interval;
    }

    return mineBlockResults;
  }
}
