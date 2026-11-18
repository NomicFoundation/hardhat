import type { NewUtilsTaskActionFunction } from "../../types.js";

import { requestQuantity } from "../connection.js";

const fetchGasPriceAction: NewUtilsTaskActionFunction = async (
  _taskArguments,
  hre,
) => {
  console.log((await requestQuantity(hre, "eth_gasPrice")).toString());
};

export default fetchGasPriceAction;
