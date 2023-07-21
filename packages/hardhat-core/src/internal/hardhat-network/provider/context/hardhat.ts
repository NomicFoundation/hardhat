import { Common } from "@nomicfoundation/ethereumjs-common";
import { Address } from "@nomicfoundation/ethereumjs-util";
import { EthContextAdapter } from "../context";
import { MemPoolAdapter } from "../mem-pool";
import { BlockMinerAdapter } from "../miner";
import { BuildBlockOpts, BlockBuilderAdapter } from "../vm/block-builder";
import { VMAdapter } from "../vm/vm-adapter";
import { NodeConfig, isForkedNodeConfig } from "../node-types";
import { EthereumJSAdapter } from "../vm/ethereumjs";
import { makeCommon } from "../utils/makeCommon";
import { HardhatBlockchainInterface } from "../types/HardhatBlockchainInterface";
import { HardhatBlockMiner } from "../miner/hardhat";
import {
  HardforkName,
  getHardforkName,
  hardforkGte,
  selectHardfork,
  validateHardforks,
} from "../../../util/hardforks";
import { RandomBufferGenerator } from "../utils/random";
import { makeForkClient } from "../utils/makeForkClient";
import { JsonRpcClient } from "../../jsonrpc/client";
import { getDifferenceInSeconds } from "../../../util/date";
import { ForkBlockchain } from "../fork/ForkBlockchain";
import { HARDHAT_NETWORK_DEFAULT_INITIAL_BASE_FEE_PER_GAS } from "../../../core/config/default-config";
import { HardforkHistoryConfig } from "../../../../types/config";
import { HardhatBlockchain } from "../HardhatBlockchain";
import { HardhatMemPool } from "../mem-pool/hardhat";
import { putGenesisBlock } from "../utils/putGenesisBlock";

export class HardhatEthContext implements EthContextAdapter {
  constructor(
    private readonly _blockchain: HardhatBlockchainInterface,
    private readonly _mempool: HardhatMemPool,
    private readonly _miner: HardhatBlockMiner,
    private readonly _vm: EthereumJSAdapter,
    private _blockTimeOffsetSeconds: bigint,
    private readonly _fork?: ForkData
  ) {}

  public static async create(
    config: NodeConfig,
    prevRandaoGenerator: RandomBufferGenerator
  ): Promise<HardhatEthContext> {
    const common = makeCommon(config);

    const { blockchain, blockTimeOffset, initialBaseFeePerGas, fork } =
      await _createBlockchain(config, common);

    const vm = await EthereumJSAdapter.create(
      common,
      blockchain,
      config,
      (blockNumber) =>
        selectHardfork(
          fork?.blockNumber,
          common.hardfork(),
          fork?.hardforkActivations,
          blockNumber
        )
    );

    const hardfork = getHardforkName(config.hardfork);
    if (!isForkedNodeConfig(config)) {
      const genesisBlockBaseFeePerGas = hardforkGte(
        hardfork,
        HardforkName.LONDON
      )
        ? initialBaseFeePerGas ??
          BigInt(HARDHAT_NETWORK_DEFAULT_INITIAL_BASE_FEE_PER_GAS)
        : undefined;

      await putGenesisBlock(
        blockchain as HardhatBlockchain,
        common,
        config,
        await vm.getStateRoot(),
        hardfork,
        prevRandaoGenerator.next(),
        genesisBlockBaseFeePerGas
      );
    }

    const memPool = new HardhatMemPool(
      BigInt(config.blockGasLimit),
      common,
      vm._stateManager
    );

    const miner = new HardhatBlockMiner(
      blockchain,
      common,
      Address.fromString(config.coinbase),
      hardfork,
      config.mempoolOrder,
      config.minGasPrice,
      prevRandaoGenerator,
      memPool,
      vm
    );

    return new HardhatEthContext(
      blockchain,
      memPool,
      miner,
      vm,
      blockTimeOffset,
      fork
    );
  }

  public blockchain(): HardhatBlockchainInterface {
    return this._blockchain;
  }

  public async blockBuilder(
    common: Common,
    opts: BuildBlockOpts
  ): Promise<BlockBuilderAdapter> {
    return this._vm.createBlockBuilder(common, opts);
  }

  public blockMiner(): BlockMinerAdapter {
    return this._miner;
  }

  public memPool(): MemPoolAdapter {
    return this._mempool;
  }

  public vm(): VMAdapter {
    return this._vm;
  }
}

class ForkData {
  constructor(
    public readonly client: JsonRpcClient,
    public readonly blockNumber: bigint,
    public readonly blockTimestamp: number,
    public readonly blockHash: string,
    public readonly hardforkActivations: HardforkHistoryConfig,
    public readonly nextBlockBaseFeePerGas?: bigint
  ) {}
}

async function _createBlockchain(
  config: NodeConfig,
  common: Common
): Promise<{
  blockchain: HardhatBlockchainInterface;
  blockTimeOffset: bigint;
  initialBaseFeePerGas?: bigint;
  fork?: ForkData;
}> {
  const initialBaseFeePerGas =
    config.initialBaseFeePerGas !== undefined
      ? BigInt(config.initialBaseFeePerGas)
      : undefined;

  const hardfork = getHardforkName(config.hardfork);

  if (isForkedNodeConfig(config)) {
    const { forkClient, forkBlockNumber, forkBlockTimestamp, forkBlockHash } =
      await makeForkClient(config.forkConfig, config.forkCachePath);

    validateHardforks(
      config.forkConfig.blockNumber,
      common,
      forkClient.getNetworkId()
    );

    let hardforkActivations: HardforkHistoryConfig = new Map();

    if (config.chains.has(forkClient.getNetworkId())) {
      hardforkActivations = config.chains.get(
        forkClient.getNetworkId()
      )!.hardforkHistory;
    }

    const blockchain = new ForkBlockchain(
      forkClient,
      forkBlockNumber,
      hardforkActivations,
      common
    );

    const initialBlockTimeOffset = BigInt(
      getDifferenceInSeconds(new Date(forkBlockTimestamp), new Date())
    );

    let nextBlockBaseFeePerGas: bigint | undefined;

    // If the hardfork is London or later we need a base fee per gas for the
    // first local block. If initialBaseFeePerGas config was provided we use
    // that. Otherwise, what we do depends on the block we forked from. If
    // it's an EIP-1559 block we don't need to do anything here, as we'll
    // end up automatically computing the next base fee per gas based on it.
    if (hardforkGte(hardfork, HardforkName.LONDON)) {
      if (initialBaseFeePerGas !== undefined) {
        nextBlockBaseFeePerGas = initialBaseFeePerGas;
      } else {
        const latestBlock = await blockchain.getLatestBlock();
        if (latestBlock.header.baseFeePerGas === undefined) {
          nextBlockBaseFeePerGas = BigInt(
            HARDHAT_NETWORK_DEFAULT_INITIAL_BASE_FEE_PER_GAS
          );
        }
      }
    }

    return {
      blockchain,
      blockTimeOffset: initialBlockTimeOffset,
      fork: new ForkData(
        forkClient,
        forkBlockNumber,
        forkBlockTimestamp,
        forkBlockHash,
        hardforkActivations,
        nextBlockBaseFeePerGas
      ),
    };
  } else {
    const blockTimeOffset =
      config.initialDate !== undefined
        ? BigInt(getDifferenceInSeconds(config.initialDate, new Date()))
        : 0n;

    return {
      blockchain: new HardhatBlockchain(common),
      blockTimeOffset,
    };
  }
}
