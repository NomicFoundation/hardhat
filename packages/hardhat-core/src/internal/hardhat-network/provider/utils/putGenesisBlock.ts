import { Block, HeaderData } from "@ethereumjs/block";
import { Common } from "@ethereumjs/common";
import { SecureTrie } from "@ethereumjs/trie";
import { bufferToHex } from "@ethereumjs/util";

import { dateToTimestampSeconds } from "../../../util/date";
import { HardhatBlockchain } from "../HardhatBlockchain";
import { LocalNodeConfig } from "../node-types";
import { getCurrentTimestamp } from "./getCurrentTimestamp";

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
