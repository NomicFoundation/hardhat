import { Common } from "@ethereumjs/common";
import { bufferToHex } from "@ethereumjs/util";

import { dateToTimestampSeconds } from "../../../util/date";
import { LocalNodeConfig } from "../node-types";

import { getCurrentTimestamp } from "./getCurrentTimestamp";

export function makeCommon(
  {
    initialDate,
    chainId,
    networkId,
    networkName,
    blockGasLimit,
    hardfork,
  }: LocalNodeConfig,
  stateTrie: any
) {
  const initialBlockTimestamp =
    initialDate !== undefined
      ? dateToTimestampSeconds(initialDate)
      : getCurrentTimestamp();

  return Common.custom(
    {
      chainId,
      networkId,
      name: networkName,
      genesis: {
        timestamp: `0x${initialBlockTimestamp.toString(16)}`,
        // hash: "0x",
        gasLimit: Number(blockGasLimit),
        difficulty: 1,
        nonce: "0x0000000000000042",
        extraData: "0x1234",
        // stateRoot: bufferToHex(stateTrie.root),
      },
    },
    {
      hardfork,
    }
  );
}
