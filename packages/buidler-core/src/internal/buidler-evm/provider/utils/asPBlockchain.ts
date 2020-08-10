import { BuidlerBlockchain } from "../BuidlerBlockchain";
import { ForkBlockchain } from "../fork/ForkBlockchain";
import { PBlockchain } from "../types/PBlockchain";

export function asPBlockchain(
  blockchain: BuidlerBlockchain | ForkBlockchain
): PBlockchain {
  return blockchain instanceof BuidlerBlockchain
    ? blockchain.asPBlockchain()
    : blockchain;
}
