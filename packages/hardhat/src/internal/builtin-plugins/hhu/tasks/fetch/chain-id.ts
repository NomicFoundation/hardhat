import type { NewUtilsTaskActionFunction } from "../../types.js";

import { requestQuantity } from "../connection.js";

const fetchChainIdAction: NewUtilsTaskActionFunction = async (
  _taskArguments,
  hre,
) => {
  console.log((await requestQuantity(hre, "eth_chainId")).toString());
};

export default fetchChainIdAction;
