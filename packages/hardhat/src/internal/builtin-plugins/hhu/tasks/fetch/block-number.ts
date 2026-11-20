import type { NewUtilsTaskActionFunction } from "../../types.js";

import { assertHardhatInvariant } from "@nomicfoundation/hardhat-errors";
import { hexStringToBigInt } from "@nomicfoundation/hardhat-utils/hex";

import { withConnection } from "../connection.js";

const fetchBlockNumberAction: NewUtilsTaskActionFunction = async (
  _taskArguments,
  hre,
) => {
  const blockNumber = await withConnection(
    hre,
    async (connection) =>
      await connection.provider.request({ method: "eth_blockNumber" }),
  );

  assertHardhatInvariant(
    typeof blockNumber === "string",
    "eth_blockNumber should return a string",
  );

  console.log(hexStringToBigInt(blockNumber).toString());
};

export default fetchBlockNumberAction;
