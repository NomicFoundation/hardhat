import { Block, HeaderData } from "@nomicfoundation/ethereumjs-block";
import { Common } from "@nomicfoundation/ethereumjs-common";
import { Trie } from "@nomicfoundation/ethereumjs-trie";
import { bufferToHex } from "@nomicfoundation/ethereumjs-util";

import { dateToTimestampSeconds } from "../../../util/date";
import { hardforkGte, HardforkName } from "../../../util/hardforks";
import { HardhatBlockchain } from "../HardhatBlockchain";
import { LocalNodeConfig } from "../node-types";
import { getCurrentTimestamp } from "./getCurrentTimestamp";

export async function putGenesisBlock(
  blockchain: HardhatBlockchain,
  common: Common,
  { initialDate, blockGasLimit: initialBlockGasLimit }: LocalNodeConfig,
  stateTrie: Trie,
  hardfork: HardforkName,
  initialMixHash: Buffer,
  initialBaseFee?: bigint
) {
  const initialBlockTimestamp =
    initialDate !== undefined
      ? dateToTimestampSeconds(initialDate)
      : getCurrentTimestamp();

  const isPostMerge = hardforkGte(hardfork, HardforkName.MERGE);

  const header: HeaderData = {
    timestamp: `0x${initialBlockTimestamp.toString(16)}`,
    gasLimit: initialBlockGasLimit,
    difficulty: isPostMerge ? 0 : 1,
    nonce: isPostMerge ? "0x0000000000000000" : "0x0000000000000042",
    extraData: "0x1234",
    stateRoot: bufferToHex(stateTrie.root()),
  };

  if (isPostMerge) {
    header.mixHash = initialMixHash;
  }

  if (initialBaseFee !== undefined) {
    header.baseFeePerGas = initialBaseFee;
  }

  const genesisBlock = Block.fromBlockData(
    {
      header,
    },
    {
      common,
      skipConsensusFormatValidation: true,
    }
  );

  await blockchain.putBlock(genesisBlock);
}
