import type { CallRequestArguments } from "./request.js";
import type { NewUtilsTaskActionFunction } from "../../types.js";

import { requestQuantity } from "../connection.js";

import { buildCallRequest } from "./request.js";

const txEstimateAction: NewUtilsTaskActionFunction<
  CallRequestArguments
> = async (taskArguments, hre) => {
  const { params } = await buildCallRequest(taskArguments);

  console.log(
    (await requestQuantity(hre, "eth_estimateGas", params)).toString(),
  );
};

export default txEstimateAction;
