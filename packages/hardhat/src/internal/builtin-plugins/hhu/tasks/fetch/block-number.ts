import type { NewUtilsTaskActionFunction } from "../../types.js";

import { assertHardhatInvariant } from "@nomicfoundation/hardhat-errors";
import { hexStringToBigInt } from "@nomicfoundation/hardhat-utils/hex";

const fetchBlockNumberAction: NewUtilsTaskActionFunction = async (
  _taskArguments,
  hre,
) => {
  const connection = await hre.network.create();

  try {
    const blockNumber = await connection.provider.request({
      method: "eth_blockNumber",
    });

    assertHardhatInvariant(
      typeof blockNumber === "string",
      "eth_blockNumber should return a string",
    );

    console.log(hexStringToBigInt(blockNumber).toString());
  } finally {
    await connection.close();
  }
};

export default fetchBlockNumberAction;
