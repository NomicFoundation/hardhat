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
  { initialDate, blockGasLimit }: LocalNodeConfig,
  stateTrie: SecureTrie,
  initialBaseFee?: bigint
) {
  const initialBlockTimestamp =
    initialDate !== undefined
      ? dateToTimestampSeconds(initialDate)
      : getCurrentTimestamp();

  const header: HeaderData = {
    timestamp: `0x${initialBlockTimestamp.toString(16)}`,
    gasLimit: blockGasLimit,
    difficulty: 1,
    nonce: "0x0000000000000042",
    extraData: "0x1234",
    stateRoot: bufferToHex(stateTrie.root),
  };

  if (initialBaseFee !== undefined) {
    header.baseFeePerGas = initialBaseFee;
  }

  const genesisBlock = Block.fromBlockData(
    {
      header,
    },
    { common }
  );

  await blockchain.putBlock(genesisBlock);
}
