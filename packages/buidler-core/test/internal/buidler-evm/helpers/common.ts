import Common from "ethereumjs-common";

import { randomHash } from "../../../../src/internal/buidler-evm/provider/fork/random";
import { getCurrentTimestamp } from "../../../../src/internal/buidler-evm/provider/utils";

import {
  DEFAULT_BLOCK_GAS_LIMIT,
  DEFAULT_CHAIN_ID,
  DEFAULT_HARDFORK,
  DEFAULT_NETWORK_ID,
  DEFAULT_NETWORK_NAME,
} from "./useProvider";

export const getTestCommon = () =>
  Common.forCustomChain(
    "mainnet",
    {
      chainId: DEFAULT_CHAIN_ID,
      networkId: DEFAULT_NETWORK_ID,
      name: DEFAULT_NETWORK_NAME,
      genesis: {
        timestamp: `0x${getCurrentTimestamp().toString(16)}`,
        hash: "0x",
        gasLimit: DEFAULT_BLOCK_GAS_LIMIT,
        difficulty: 1,
        nonce: "0x42",
        extraData: "0x1234",
        stateRoot: randomHash(),
      },
    },
    DEFAULT_HARDFORK
  );
