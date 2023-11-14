import cloneDeep from "lodash/cloneDeep";
import { timestampSecondsToDate } from "../../../util/date";
import { HardforkName } from "../../../util/hardforks";
import { DualBlockMiner } from "../miner/dual";
import { DualMemPool } from "../mem-pool/dual";
import { makeCommon } from "../utils/makeCommon";
import { RandomBufferGenerator } from "../utils/random";
import { BlockchainAdapter } from "../blockchain";
import { DualBlockchain } from "../blockchain/dual";
import { EthContextAdapter } from "../context";
import { randomHashSeed } from "../fork/ForkStateManager";
import { MemPoolAdapter } from "../mem-pool";
import { BlockMinerAdapter } from "../miner";
import { NodeConfig, isForkedNodeConfig } from "../node-types";
import { DualModeAdapter } from "../vm/dual";
import { VMAdapter } from "../vm/vm-adapter";
import { EthereumJSAdapter } from "../vm/ethereumjs";
import { HardhatEthContext } from "./hardhat";
import { EdrEthContext, getGlobalEdrContext } from "./edr";

export class DualEthContext implements EthContextAdapter {
  constructor(
    private readonly _hardhat: HardhatEthContext,
    private readonly _edr: EdrEthContext,
    private readonly _vm: DualModeAdapter
  ) {}

  public static async create(
    config: NodeConfig,
    prevRandaoGenerator: RandomBufferGenerator
  ): Promise<DualEthContext> {
    // To synchronise config options between the two adapters, we make local modifications.
    // To avoid this from affecting the original config object, we clone it first.
    const tempConfig = cloneDeep(config);

    // When transient storage is enabled, we want to use Cancun. However, as Shanghai is
    // the latest supported hardfork by ethereumJS, we designate that.
    if (tempConfig.enableTransientStorage) {
      tempConfig.hardfork = HardforkName.SHANGHAI;
    }

    // Ensure that the state root generators' seeds are the same.
    // This avoids a failing test from affecting consequent tests.
    getGlobalEdrContext().setStateRootGeneratorSeed(randomHashSeed());

    const common = makeCommon(tempConfig);

    const hardhat = await HardhatEthContext.create(
      tempConfig,
      prevRandaoGenerator
    );

    if (isForkedNodeConfig(tempConfig)) {
      // If the fork node config doesn't specify a block number, then the
      // ethereumjs adapter will fetch and use the latest block number. We re-use
      // that value here; otherwise, EDR would also fetch it and we could have
      // a race condition if the latest block changed in the meantime.
      if (tempConfig.forkConfig.blockNumber === undefined) {
        const forkBlockNumber = (
          hardhat.vm() as EthereumJSAdapter
        ).getForkBlockNumber();
        tempConfig.forkConfig.blockNumber = Number(forkBlockNumber!);
      }
    } else {
      // For local genesis blocks, we need to ensure that the timestamp between the two
      // adapters is in sync, so we extract it from the latest block.
      const latestBlock = await hardhat.blockchain().getLatestBlock();
      tempConfig.initialDate = timestampSecondsToDate(
        Number(latestBlock.header.timestamp)
      );
    }

    const edr = await EdrEthContext.create(tempConfig);

    const vm = new DualModeAdapter(common, hardhat.vm(), edr.vm());

    const context = new DualEthContext(hardhat, edr, vm);

    // Validate the state root
    await context.vm().getStateRoot();

    // Validate that the latest block numbers are equal
    await context.blockchain().getLatestBlockNumber();

    // Validate that the latest blocks are equal
    await context.blockchain().getLatestBlock();

    return context;
  }

  public blockchain(): BlockchainAdapter {
    return new DualBlockchain(
      this._hardhat.blockchain(),
      this._edr.blockchain()
    );
  }

  public blockMiner(): BlockMinerAdapter {
    return new DualBlockMiner(
      this._hardhat.blockMiner(),
      this._edr.blockMiner()
    );
  }

  public memPool(): MemPoolAdapter {
    return new DualMemPool(this._hardhat.memPool(), this._edr.memPool());
  }

  public vm(): VMAdapter {
    return this._vm;
  }
}
