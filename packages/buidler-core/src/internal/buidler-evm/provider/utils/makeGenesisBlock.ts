import Common from "ethereumjs-common";

import { BuidlerBlockchain } from "../BuidlerBlockchain";
import { ForkBlockchain } from "../fork/ForkBlockchain";
import { Block } from "../types/Block";

export async function makeGenesisBlock(
  blockchain: BuidlerBlockchain | ForkBlockchain,
  common: Common
) {
  const genesisBlock = new Block(null, { common });
  genesisBlock.setGenesisParams();

  if (blockchain instanceof BuidlerBlockchain) {
    await blockchain.asPBlockchain().putBlock(genesisBlock);
  }

  return genesisBlock;
}
