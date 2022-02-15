import { Block, HeaderData } from "@ethereumjs/block";
import Common from "@ethereumjs/common";
import { BN } from "ethereumjs-util";

import { HardhatBlockchain } from "../HardhatBlockchain";

export async function putGenesisBlock(
  blockchain: HardhatBlockchain,
  common: Common,
  initialBaseFee?: BN
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
  await blockchain.putBlock(genesisBlock);
}
