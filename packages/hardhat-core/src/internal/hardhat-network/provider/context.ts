import { Common } from "@nomicfoundation/ethereumjs-common";
import { VMAdapter } from "./vm/vm-adapter";
import { MemPoolAdapter } from "./mem-pool";
import { BlockMinerAdapter } from "./miner";
import { BlockBuilderAdapter, BuildBlockOpts } from "./vm/block-builder";
import { BlockchainAdapter } from "./blockchain";

export interface EthContextAdapter {
  blockchain(): BlockchainAdapter;

  blockBuilder(
    common: Common,
    opts: BuildBlockOpts
  ): Promise<BlockBuilderAdapter>;

  blockMiner(): BlockMinerAdapter;

  memPool(): MemPoolAdapter;

  vm(): VMAdapter;
}
