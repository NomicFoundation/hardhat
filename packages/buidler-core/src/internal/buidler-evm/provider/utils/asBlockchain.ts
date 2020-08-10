import { BuidlerBlockchain } from "../BuidlerBlockchain";
import { ForkBlockchain } from "../fork/ForkBlockchain";
import { Blockchain } from "../types/Blockchain";

export function asBlockchain(
  blockchain: BuidlerBlockchain | ForkBlockchain
): Blockchain {
  return blockchain instanceof ForkBlockchain
    ? blockchain.asBlockchain()
    : blockchain;
}
