import Common from "@ethereumjs/common";

import { ForkedNodeConfig } from "../node-types";

export async function makeForkCommon(config: ForkedNodeConfig) {
  const { chainId, networkId, networkName } = config;
  return Common.forCustomChain(
    "mainnet",
    {
      chainId,
      networkId,
      name: networkName,
    },
    config.hardfork
  );
}
