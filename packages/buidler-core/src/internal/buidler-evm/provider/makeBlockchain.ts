import Common from "ethereumjs-common";

import { Block } from "./Block";
import { Blockchain } from "./blockchain";

export async function makeBlockchain(common: Common) {
  const blockchain = new Blockchain();

  const genesisBlock = new Block(null, { common });
  genesisBlock.setGenesisParams();

  await new Promise((resolve) => {
    blockchain.putBlock(genesisBlock, () => resolve());
  });

  return { blockchain, genesisBlock };
}
