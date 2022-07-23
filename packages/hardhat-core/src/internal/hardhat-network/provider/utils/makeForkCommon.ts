import { Common } from "@ethereumjs/common";

import { ForkedNodeConfig } from "../node-types";

export async function makeForkCommon(config: ForkedNodeConfig) {
  return Common.custom(
    {
      chainId: config.chainId,
      networkId: config.networkId,
      name: config.networkName,
    },
    { hardfork: config.hardfork }
  );
}
