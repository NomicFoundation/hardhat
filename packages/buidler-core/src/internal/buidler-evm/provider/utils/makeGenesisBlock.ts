import Common from "ethereumjs-common";

import { BuidlerBlockchain } from "../BuidlerBlockchain";
import { Block } from "../types/Block";

export async function makeGenesisBlock(
  blockchain: BuidlerBlockchain,
  common: Common
) {
  const genesisBlock = new Block(null, { common });
  genesisBlock.setGenesisParams();

  await new Promise((resolve) => {
    blockchain.putBlock(genesisBlock, () => resolve());
  });

  return genesisBlock;
}
