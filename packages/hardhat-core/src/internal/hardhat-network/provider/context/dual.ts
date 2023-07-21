import { Common } from "@nomicfoundation/ethereumjs-common";
import { DualBlockMiner } from "../miner/dual";
import { DualMemPool } from "../mem-pool/dual";
import { HardhatBlockchainInterface } from "../types/HardhatBlockchainInterface";
import { makeCommon } from "../utils/makeCommon";
import { RandomBufferGenerator } from "../utils/random";
import { DualModeBlockBuilder } from "../vm/block-builder/dual";
import { BuildBlockOpts, BlockBuilderAdapter } from "../vm/block-builder";
import { DualModeAdapter } from "../vm/dual";
import { VMAdapter } from "../vm/vm-adapter";
import { EthereumJSAdapter } from "../vm/ethereumjs";
import { EthContextAdapter } from "../context";
import { MemPoolAdapter } from "../mem-pool";
import { BlockMinerAdapter } from "../miner";
import { NodeConfig, isForkedNodeConfig } from "../node-types";
import { HardhatEthContext } from "./hardhat";
import { RethnetEthContext } from "./rethnet";
import { BlockchainAdapter } from "../blockchain";

export class DualEthContext implements EthContextAdapter {
  constructor(
    private readonly _hardhat: HardhatEthContext,
    private readonly _rethnet: RethnetEthContext,
    private readonly _vm: DualModeAdapter
  ) {}

  public static async create(
    config: NodeConfig,
    prevRandaoGenerator: RandomBufferGenerator
  ): Promise<DualEthContext> {
    const common = makeCommon(config);

    const hardhat = await HardhatEthContext.create(config, prevRandaoGenerator);

    // If the fork node config doesn't specify a block number, then the
    // ethereumjs adapter will fetch and use the latest block number. We re-use
    // that value here; otherwise, rethnet would also fetch it and we could have
    // a race condition if the latest block changed in the meantime.
    if (
      isForkedNodeConfig(config) &&
      config.forkConfig.blockNumber === undefined
    ) {
      const forkBlockNumber = (
        hardhat.vm() as EthereumJSAdapter
      ).getForkBlockNumber();
      config.forkConfig.blockNumber = parseInt(
        forkBlockNumber!.toString(10),
        10
      );
    }

    const rethnet = new RethnetEthContext(config);

    const vm = new DualModeAdapter(common, hardhat.vm(), rethnet.vm());

    return new DualEthContext(hardhat, rethnet, vm);
  }

  public async blockchain(): BlockchainAdapter {}

  public async blockBuilder(
    common: Common,
    opts: BuildBlockOpts
  ): Promise<BlockBuilderAdapter> {
    return new DualModeBlockBuilder(
      await this._hardhat.blockBuilder(common, opts),
      await this._rethnet.blockBuilder(common, opts)
    );
  }

  public blockMiner(): BlockMinerAdapter {
    return new DualBlockMiner(
      this._hardhat.blockMiner(),
      this._rethnet.blockMiner()
    );
  }

  public memPool(): MemPoolAdapter {
    return new DualMemPool(this._hardhat.memPool(), this._rethnet.memPool());
  }

  public vm(): VMAdapter {
    return this._vm;
  }
}
