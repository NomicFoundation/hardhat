import { Block } from "@ethereumjs/block";
import Common from "@ethereumjs/common";

import { HardhatBlockchain } from "../HardhatBlockchain";

export async function putGenesisBlock(
  blockchain: HardhatBlockchain,
  common: Common
) {
  const genesisBlock = Block.genesis(undefined, { common });
  await blockchain.addBlock(genesisBlock);
}
