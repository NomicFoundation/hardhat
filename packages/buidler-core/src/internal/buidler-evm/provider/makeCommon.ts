import Common from "ethereumjs-common";
import { bufferToHex } from "ethereumjs-util";

import { dateToTimestampSeconds } from "../../util/date";

import { getCurrentTimestamp } from "./utils";

export function makeCommon(
  initialDate: Date | undefined,
  chainId: number,
  networkId: number,
  networkName: string,
  blockGasLimit: number,
  stateTrie: any,
  hardfork: string
) {
  const initialBlockTimestamp =
    initialDate !== undefined
      ? dateToTimestampSeconds(initialDate)
      : getCurrentTimestamp();

  return Common.forCustomChain(
    "mainnet",
    {
      chainId,
      networkId,
      name: networkName,
      genesis: {
        timestamp: `0x${initialBlockTimestamp.toString(16)}`,
        hash: "0x",
        gasLimit: blockGasLimit,
        difficulty: 1,
        nonce: "0x42",
        extraData: "0x1234",
        stateRoot: bufferToHex(stateTrie.root),
      },
    },
    hardfork
  );
}
