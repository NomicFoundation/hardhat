import { Blockchain } from "./Blockchain";
import { BuidlerBlockchain } from "./BuidlerBlockchain";
import { ForkBlockchain } from "./fork/ForkBlockchain";

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
