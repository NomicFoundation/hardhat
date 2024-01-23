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
      // ethereumjs uses this name for the merge hardfork
      hardfork: hardfork === "merge" ? "mergeForkIdTransition" : hardfork,
      ...otherSettings,
    }
  );

  return common;
}
