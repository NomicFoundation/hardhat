import Common from "@ethereumjs/common";
import { bufferToHex } from "ethereumjs-util";

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
  stateRoot: Buffer
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
        nonce: "0x0000000000000042",
        extraData: "0x1234",
        stateRoot: bufferToHex(stateRoot),
      },
    },
    hardfork
  );
}
