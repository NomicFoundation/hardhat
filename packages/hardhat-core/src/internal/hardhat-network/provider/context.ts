import { VMAdapter } from "./vm/vm-adapter";
import { MemPoolAdapter } from "./mem-pool";
import { BlockMinerAdapter } from "./miner";
import { BlockchainAdapter } from "./blockchain";

export interface EthContextAdapter {
  blockchain(): BlockchainAdapter;

  blockMiner(): BlockMinerAdapter;

  memPool(): MemPoolAdapter;

  vm(): VMAdapter;
}
