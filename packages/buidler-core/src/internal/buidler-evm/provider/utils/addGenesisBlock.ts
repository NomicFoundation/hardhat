import Common from "ethereumjs-common";

import { BuidlerBlockchain } from "../BuidlerBlockchain";
import { Block } from "../types/Block";

export async function addGenesisBlock(
  blockchain: BuidlerBlockchain,
  common: Common
) {
  const genesisBlock = new Block(null, { common });
  genesisBlock.setGenesisParams();
  await blockchain.asPBlockchain().putBlock(genesisBlock);
}
