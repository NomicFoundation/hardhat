import { Common } from "@nomicfoundation/ethereumjs-common";
import { Address } from "@nomicfoundation/ethereumjs-util";
import { MineOrdering, mineBlock } from "rethnet-evm";
import { BlockMinerAdapter, PartialMineBlockResult } from "../miner";
import {
  rethnetBlockToEthereumJS,
  rethnetReceiptToEthereumJsTxReceipt,
  rethnetResultToRunTxResult,
} from "../utils/convertToRethnet";
import { VMTracer } from "../../stack-traces/vm-tracer";
import { PartialTrace } from "../vm/vm-adapter";
import { RethnetBlockchain } from "../blockchain/rethnet";
import { RethnetStateManager } from "../RethnetState";
import { RethnetMemPool } from "../mem-pool/rethnet";
import { RandomBufferGenerator } from "../utils/random";
import { makeConfigOptions } from "../vm/rethnet";
import { HardforkName } from "../../../util/hardforks";

export class RethnetMiner implements BlockMinerAdapter {
  constructor(
    private readonly _blockchain: RethnetBlockchain,
    private readonly _stateManager: RethnetStateManager,
    private readonly _memPool: RethnetMemPool,
    private readonly _common: Common,
    private readonly _limitContractCodeSize: bigint | null,
    private _mineOrdering: MineOrdering,
    private _prevRandaoGenerator: RandomBufferGenerator
  ) {}

  public async mineBlock(
    blockTimestamp: bigint,
    coinbase: Address,
    minGasPrice: bigint,
    minerReward: bigint,
    baseFeePerGas?: bigint
  ): Promise<PartialMineBlockResult> {
    let prevRandao: Buffer | undefined;
    if (this._common.gteHardfork(HardforkName.MERGE)) {
      prevRandao = this._prevRandaoGenerator.next();
    }

    const mineResult = await mineBlock(
      this._blockchain.asInner(),
      this._stateManager.asInner(),
      this._memPool.asInner(),
      makeConfigOptions(this._common, false, true, this._limitContractCodeSize),
      blockTimestamp,
      coinbase.buf,
      minGasPrice,
      this._mineOrdering,
      minerReward,
      baseFeePerGas,
      prevRandao
    );

    this._stateManager.setInner(mineResult.state);

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
      }

      const trace = vmTracer.getLastTopLevelMessageTrace();
      const error = vmTracer.getLastError();

      vmTracer.clearLastError();

      traces.push({ trace, error });
    }

    const receipts = await mineResult.block.receipts();

    return {
      block: rethnetBlockToEthereumJS(mineResult.block, this._common),
      blockResult: {
        results: mineResult.results.map((result, index, _array) => {
          return rethnetResultToRunTxResult(
            result,
            receipts[index].cumulativeGasUsed
          );
        }),
        receipts: receipts.map((receipt, _index, _array) => {
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

  public prevRandaoGeneratorSeed(): Buffer {
    return this._prevRandaoGenerator.seed();
  }

  public setPrevRandaoGeneratorNextValue(nextValue: Buffer): void {
    this._prevRandaoGenerator.setNext(nextValue);
  }
}
