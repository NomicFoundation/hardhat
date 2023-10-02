import { Common } from "@nomicfoundation/ethereumjs-common";
import { Address } from "@nomicfoundation/ethereumjs-util";
import { ConfigOptions, MineOrdering, SpecId, mineBlock } from "@ignored/edr";
import { BlockMinerAdapter, PartialMineBlockResult } from "../miner";
import {
  rethnetBlockToEthereumJS,
  rethnetReceiptToEthereumJsTxReceipt,
  rethnetResultToRunTxResult,
  rethnetSpecIdToEthereumHardfork,
} from "../utils/convertToRethnet";
import { VMTracer } from "../../stack-traces/vm-tracer";
import { PartialTrace } from "../vm/vm-adapter";
import { RethnetBlockchain } from "../blockchain/rethnet";
import { RethnetStateManager } from "../RethnetState";
import { RethnetMemPool } from "../mem-pool/rethnet";
import { RandomBufferGenerator } from "../utils/random";

export class RethnetMiner implements BlockMinerAdapter {
  constructor(
    private readonly _blockchain: RethnetBlockchain,
    private readonly _stateManager: RethnetStateManager,
    private readonly _memPool: RethnetMemPool,
    private readonly _common: Common,
    private readonly _limitContractCodeSize: bigint | undefined,
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

    const specId = await this._blockchain.asInner().specId();
    if (specId >= SpecId.Merge) {
      prevRandao = this._prevRandaoGenerator.next();
    }

    const config: ConfigOptions = {
      chainId: this._common.chainId(),
      specId,
      limitContractCodeSize: this._limitContractCodeSize,
      disableBlockGasLimit: false,
      disableEip3607: true,
    };

    const mineResult = await mineBlock(
      this._blockchain.asInner(),
      this._stateManager.asInner(),
      this._memPool.asInner(),
      config,
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

    const common = _commonWithSpecId(this._common, specId);
    const vmTracer = new VMTracer(common, false);

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
      block: rethnetBlockToEthereumJS(mineResult.block, common),
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

function _commonWithSpecId(common: Common, specId: SpecId): Common {
  const newCommon = common.copy();
  newCommon.setHardfork(rethnetSpecIdToEthereumHardfork(specId));
  return newCommon;
}
