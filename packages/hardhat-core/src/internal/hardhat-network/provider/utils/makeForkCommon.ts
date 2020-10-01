import Common from "ethereumjs-common";
import { BN } from "ethereumjs-util";

import { JsonRpcClient } from "../../jsonrpc/client";

export async function makeForkCommon(
  forkClient: JsonRpcClient,
  forkBlockNumber: BN
) {
  const common = new Common(forkClient.getNetworkId());
  common.setHardfork(common.activeHardfork(forkBlockNumber.toNumber()));
  return common;
}
