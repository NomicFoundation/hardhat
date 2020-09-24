import Common from "ethereumjs-common";

import { HardhatBlockchain } from "../HardhatBlockchain";
import { Block } from "../types/Block";

export async function putGenesisBlock(
  blockchain: HardhatBlockchain,
  common: Common
) {
  const genesisBlock = new Block(null, { common });
  genesisBlock.setGenesisParams();
  await blockchain.addBlock(genesisBlock);
}
