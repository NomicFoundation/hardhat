import type { CallRequestArguments } from "./request.js";
import type { NewUtilsTaskActionFunction } from "../../types.js";

import { assertHardhatInvariant } from "@nomicfoundation/hardhat-errors";
import { hexStringToBigInt } from "@nomicfoundation/hardhat-utils/hex";

import { withConnection } from "../connection.js";

import { buildCallRequest } from "./request.js";

const txEstimateAction: NewUtilsTaskActionFunction<
  CallRequestArguments
> = async (taskArguments, hre) => {
  const { params } = await buildCallRequest(taskArguments);

  const gas = await withConnection(
    hre,
    async (connection) =>
      await connection.provider.request({ method: "eth_estimateGas", params }),
  );

  assertHardhatInvariant(
    typeof gas === "string",
    "eth_estimateGas should return a string",
  );

  console.log(hexStringToBigInt(gas).toString());
};

export default txEstimateAction;
