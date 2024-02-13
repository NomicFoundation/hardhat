import { Common } from "@nomicfoundation/ethereumjs-common";

import { LocalNodeConfig } from "../node-types";
import { HardforkName } from "../../../util/hardforks";
import { assertTransientStorageCompatibility } from "../node";

export function makeCommon({
  chainId,
  networkId,
  hardfork,
  enableTransientStorage,
}: LocalNodeConfig) {
  assertTransientStorageCompatibility(
    enableTransientStorage,
    hardfork as HardforkName
  );

  const common = Common.custom(
    {
      chainId,
      networkId,
    },
    {
      // ethereumjs uses this name for the merge hardfork
      hardfork:
        hardfork === HardforkName.MERGE ? "mergeForkIdTransition" : hardfork,
    }
  );

  return common;
}
