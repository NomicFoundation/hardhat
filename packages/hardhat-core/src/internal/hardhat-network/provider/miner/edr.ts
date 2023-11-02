import type { MinimalInterpreterStep } from "../vm/proxy-vm";

import { Common } from "@nomicfoundation/ethereumjs-common";
import { EVMResult, Message } from "@nomicfoundation/ethereumjs-evm";
import { Address } from "@nomicfoundation/ethereumjs-util";
import {
  ConfigOptions,
  ExecutionResult,
  MineOrdering,
  SpecId,
  Tracer,
  TracingMessage,
  mineBlock,
} from "@ignored/edr";
import { assertHardhatInvariant } from "../../../core/errors";
import { BlockMinerAdapter, PartialMineBlockResult } from "../miner";
import {
  edrBlockToEthereumJS,
  edrReceiptToEthereumJsTxReceipt,
  edrResultToEthereumjsEvmResult,
  edrResultToRunTxResult,
  edrSpecIdToEthereumHardfork,
  edrTracingMessageToEthereumjsMessage,
  ethereumjsEvmResultToEdrResult,
  ethereumjsMessageToEdrTracingMessage,
} from "../utils/convertToEdr";
import { VMTracer } from "../../stack-traces/vm-tracer";
import { PartialTrace } from "../vm/vm-adapter";
import { EdrBlockchain } from "../blockchain/edr";
import { EdrStateManager } from "../EdrState";
import { EdrMemPool } from "../mem-pool/edr";
import { RandomBufferGenerator } from "../utils/random";

export class EdrMiner implements BlockMinerAdapter {
  private _stepListeners: Array<
    (step: MinimalInterpreterStep, next?: any) => Promise<void>
  > = [];
  private _beforeMessageListeners: Array<
    (message: Message, next?: any) => Promise<void>
  > = [];
  private _afterMessageListeners: Array<
    (result: EVMResult, next?: any) => Promise<void>
  > = [];

  constructor(
    private readonly _blockchain: EdrBlockchain,
    private readonly _stateManager: EdrStateManager,
    private readonly _memPool: EdrMemPool,
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
      prevRandao,
      this._tracer()
    );

    const traces: PartialTrace[] = [];

    const common = _commonWithSpecId(this._common, specId);
    const vmTracer = new VMTracer(common, false);

    for (const mineTrace of mineResult.traces) {
      for (const traceItem of mineTrace) {
        if ("pc" in traceItem) {
          await vmTracer.addStep(traceItem);

          for (const listener of this._stepListeners) {
            await listener({
              pc: Number(traceItem.pc),
              depth: traceItem.depth,
              opcode: { name: traceItem.opcode },
              stack:
                traceItem.stackTop !== undefined ? [traceItem.stackTop] : [],
            });
          }
        } else if ("executionResult" in traceItem) {
          await vmTracer.addAfterMessage(traceItem.executionResult);
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

    const totalDifficultyAfterBlock =
      await this._blockchain.getTotalDifficultyByHash(mineResult.block.hash());

    assertHardhatInvariant(
      totalDifficultyAfterBlock !== undefined,
      "the total difficulty of the mined block should be defined"
    );

    return {
      block: edrBlockToEthereumJS(mineResult.block, common),
      blockResult: {
        results: mineResult.results.map((result, index, _array) => {
          return edrResultToRunTxResult(
            result,
            receipts[index].cumulativeGasUsed
          );
        }),
        receipts: receipts.map((receipt, _index, _array) => {
          return edrReceiptToEthereumJsTxReceipt(receipt);
        }),
        stateRoot: mineResult.block.header.stateRoot,
        logsBloom: mineResult.block.header.logsBloom,
        receiptsRoot: mineResult.block.header.receiptsRoot,
        gasUsed: mineResult.block.header.gasUsed,
      },
      totalDifficultyAfterBlock,
      traces,
    };
  }

  public prevRandaoGeneratorSeed(): Buffer {
    return this._prevRandaoGenerator.seed();
  }

  public setPrevRandaoGeneratorNextValue(nextValue: Buffer): void {
    this._prevRandaoGenerator.setNext(nextValue);
  }

  public onStep(
    cb: (step: MinimalInterpreterStep, next?: any) => Promise<void>
  ) {
    this._stepListeners.push(cb);
  }

  public onBeforeMessage(cb: (message: Message, next?: any) => Promise<void>) {
    this._beforeMessageListeners.push(cb);
  }

  public onAfterMessage(cb: (result: EVMResult, next?: any) => Promise<void>) {
    this._afterMessageListeners.push(cb);
  }

  private _tracer(): Tracer | undefined {
    if (!this._hasListeners()) {
      return undefined;
    }

    return new Tracer({
      beforeCall: async (tracingMessage: TracingMessage, _next: any) => {
        const message = edrTracingMessageToEthereumjsMessage(tracingMessage);

        for (const listener of this._beforeMessageListeners) {
          await listener(message);
        }

        return ethereumjsMessageToEdrTracingMessage(message);
      },
      afterCall: async (result: ExecutionResult, _next: any) => {
        const evmResult = edrResultToEthereumjsEvmResult(result);
        for (const listener of this._afterMessageListeners) {
          await listener(evmResult);
        }

        return ethereumjsEvmResultToEdrResult(evmResult);
      },
    });
  }

  private _hasListeners(): boolean {
    return (
      this._beforeMessageListeners.length > 0 ||
      this._afterMessageListeners.length > 0
    );
  }
}

function _commonWithSpecId(common: Common, specId: SpecId): Common {
  const newCommon = common.copy();
  newCommon.setHardfork(edrSpecIdToEthereumHardfork(specId));
  return newCommon;
}
