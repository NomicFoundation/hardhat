import Common from "ethereumjs-common";

import { Block } from "./Block";
import { BuidlerBlockchain } from "./BuidlerBlockchain";

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
