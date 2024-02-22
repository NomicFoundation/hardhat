import { Common } from "@nomicfoundation/ethereumjs-common";

import { LocalNodeConfig } from "../node-types";

export function makeCommon({
  chainId,
  networkId,
  hardfork,
  enableTransientStorage,
}: LocalNodeConfig) {
  const otherSettings = enableTransientStorage ? { eips: [1153] } : {};

  const common = Common.custom(
    {
      chainId,
      networkId,
    },
    {
      hardfork,
      ...otherSettings,
    }
  );

  return common;
}
