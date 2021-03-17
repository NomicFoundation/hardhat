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
  stateTrie: any
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
        // Error: nonce must be 8 bytes, received 1 bytes
        // nonce: "0x42",
        nonce: "0x0000000000000042",
        extraData: "0x1234",
        stateRoot: bufferToHex(stateTrie.root),
      },
    },
    // "chainstart"
    // ProviderError: Genesis parameters can only be set with a Common instance set to chainstart
    hardfork
  );
}
