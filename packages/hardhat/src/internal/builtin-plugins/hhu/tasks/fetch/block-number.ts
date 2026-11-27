import type { NewUtilsTaskActionFunction } from "../../types.js";

import { requestQuantity } from "../connection.js";

const fetchBlockNumberAction: NewUtilsTaskActionFunction = async (
  _taskArguments,
  hre,
) => {
  console.log((await requestQuantity(hre, "eth_blockNumber")).toString());
};

export default fetchBlockNumberAction;
