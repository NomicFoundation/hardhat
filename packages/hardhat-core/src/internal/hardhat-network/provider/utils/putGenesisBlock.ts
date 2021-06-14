import { Block, HeaderData } from "@ethereumjs/block";
import Common from "@ethereumjs/common";

import { HardhatBlockchain } from "../HardhatBlockchain";

export async function putGenesisBlock(
  blockchain: HardhatBlockchain,
  common: Common,
  initialBaseFee?: number
) {
  const header: HeaderData = {};

  if (initialBaseFee !== undefined) {
    header.baseFeePerGas = initialBaseFee;
  }

  const genesisBlock = Block.genesis(
    {
      header,
    },
    { common }
  );
  await blockchain.addBlock(genesisBlock);
}
