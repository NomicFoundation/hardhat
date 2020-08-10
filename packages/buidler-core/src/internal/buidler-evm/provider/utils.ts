import { StateManager as VMStateManager } from "@nomiclabs/ethereumjs-vm/dist/state";
import VMPStateManager from "@nomiclabs/ethereumjs-vm/dist/state/promisified";

import { BuidlerBlockchain } from "./BuidlerBlockchain";
import { ForkBlockchain } from "./fork/ForkBlockchain";
import { ForkStateManager } from "./fork/ForkStateManager";
import { Blockchain } from "./types/Blockchain";
import { PBlockchain } from "./types/PBlockchain";
import { PStateManager } from "./types/PStateManager";
import { StateManager } from "./types/StateManager";

export function getCurrentTimestamp(): number {
  return Math.ceil(new Date().getTime() / 1000);
}

export function asStateManager(
  stateManager: StateManager | ForkStateManager
): StateManager {
  return stateManager instanceof ForkStateManager
    ? stateManager.asStateManager()
    : stateManager;
}

export function asPStateManager(
  stateManager: VMStateManager | ForkStateManager
): PStateManager {
  return stateManager instanceof ForkStateManager
    ? stateManager
    : new VMPStateManager(stateManager);
}

export function asBlockchain(
  blockchain: BuidlerBlockchain | ForkBlockchain
): Blockchain {
  return blockchain instanceof ForkBlockchain
    ? blockchain.asBlockchain()
    : blockchain;
}

export function asPBlockchain(
  blockchain: BuidlerBlockchain | ForkBlockchain
): PBlockchain {
  return blockchain instanceof BuidlerBlockchain
    ? blockchain.asPBlockchain()
    : blockchain;
}
