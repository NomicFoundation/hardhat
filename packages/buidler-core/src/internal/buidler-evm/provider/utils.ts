import { StateManager as VMStateManager } from "@nomiclabs/ethereumjs-vm/dist/state";
import VMPStateManager from "@nomiclabs/ethereumjs-vm/dist/state/promisified";

import { Blockchain } from "./Blockchain";
import { BuidlerBlockchain } from "./BuidlerBlockchain";
import { ForkBlockchain } from "./fork/ForkBlockchain";
import { ForkStateManager } from "./fork/ForkStateManager";
import { StateManager } from "./fork/StateManager";
import { PBlockchain } from "./PBlockchain";
import { PStateManager } from "./PStateManager";

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
