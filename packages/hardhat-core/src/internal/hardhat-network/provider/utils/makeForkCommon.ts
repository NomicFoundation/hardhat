import Common from "@ethereumjs/common";

import { ForkedNodeConfig } from "../node-types";

export async function makeForkCommon(config: ForkedNodeConfig) {
  return Common.forCustomChain(
    "mainnet",
    {
      chainId: config.chainId,
      networkId: config.networkId,
      name: config.networkName,
    },
    config.hardfork
  );
}
