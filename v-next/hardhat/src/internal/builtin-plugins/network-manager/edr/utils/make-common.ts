import type { LocalNodeConfig } from "../types/node-types.js";

import { Common } from "@nomicfoundation/ethereumjs-common";

import { HardforkName } from "../types/hardfork.js";

export function makeCommon({
  chainId,
  networkId,
  hardfork,
}: LocalNodeConfig): Common {
  const common = Common.custom(
    {
      chainId,
      networkId,
    },
    {
      // ethereumjs uses this name for the merge hardfork
      hardfork:
        hardfork === HardforkName.MERGE ? "mergeForkIdTransition" : hardfork,
    },
  );

  return common;
}
