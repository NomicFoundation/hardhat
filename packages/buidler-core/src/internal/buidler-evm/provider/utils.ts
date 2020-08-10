import { Blockchain } from "./Blockchain";
import { BuidlerBlockchain } from "./BuidlerBlockchain";
import { ForkBlockchain } from "./fork/ForkBlockchain";
import { PBlockchain } from "./PBlockchain";

export function getCurrentTimestamp(): number {
  return Math.ceil(new Date().getTime() / 1000);
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
