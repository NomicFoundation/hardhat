import { HeaderData } from "@nomicfoundation/ethereumjs-block";
import { bufferToHex } from "@nomicfoundation/ethereumjs-util";

import { dateToTimestampSeconds } from "../../../util/date";
import { hardforkGte, HardforkName } from "../../../util/hardforks";
import { LocalNodeConfig } from "../node-types";
import { getCurrentTimestamp } from "./getCurrentTimestamp";
import { RandomBufferGenerator } from "./random";

export function makeGenesisBlock(
  { initialDate, blockGasLimit: initialBlockGasLimit }: LocalNodeConfig,
  stateRoot: Buffer,
  hardfork: HardforkName,
  prevRandaoGenerator: RandomBufferGenerator,
  initialBaseFee?: bigint
): HeaderData {
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
    stateRoot: bufferToHex(stateRoot),
  };

  if (isPostMerge) {
    header.mixHash = prevRandaoGenerator.next();
  }

  if (initialBaseFee !== undefined) {
    header.baseFeePerGas = initialBaseFee;
  }

  return header;
}
