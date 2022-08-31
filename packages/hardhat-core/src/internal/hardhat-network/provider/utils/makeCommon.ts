import { Common } from "@nomicfoundation/ethereumjs-common";

import { LocalNodeConfig } from "../node-types";

export function makeCommon({ chainId, networkId, hardfork }: LocalNodeConfig) {
  const common = Common.custom(
    {
      chainId,
      networkId,
    },
    {
      hardfork,
    }
  );

  return common;
}
