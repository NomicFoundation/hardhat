import { Common } from "@ethereumjs/common";

import { LocalNodeConfig } from "../node-types";

export function makeCommon({
  chainId,
  networkId,
  networkName,
  hardfork,
}: LocalNodeConfig) {
  const common = Common.custom(
    {
      chainId,
      networkId,
      name: networkName,
    },
    {
      hardfork,
    }
  );

  return common;
}
