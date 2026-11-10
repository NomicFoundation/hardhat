import type { CallRequestArguments } from "./request.js";
import type { NewUtilsTaskActionFunction } from "../../types.js";

import {
  HardhatError,
  assertHardhatInvariant,
} from "@nomicfoundation/hardhat-errors";
import {
  decodeAbiParameters,
  isAbiDecodingError,
} from "@nomicfoundation/hardhat-utils/abi";
import { ensureError } from "@nomicfoundation/hardhat-utils/error";
import { isPrefixedHexString } from "@nomicfoundation/hardhat-utils/hex";

import { formatAbiValue } from "../abi/format.js";
import { withConnection } from "../connection.js";

import { buildCallRequest } from "./request.js";

const txCallAction: NewUtilsTaskActionFunction<CallRequestArguments> = async (
  taskArguments,
  hre,
) => {
  const { params, outputs } = await buildCallRequest(taskArguments);

  const result = await withConnection(
    hre,
    async (connection) =>
      await connection.provider.request({ method: "eth_call", params }),
  );

  assertHardhatInvariant(
    typeof result === "string" && isPrefixedHexString(result),
    "eth_call should return a hex string",
  );

  if (outputs.length === 0) {
    console.log(result);
    return;
  }

  // `to` has no code (e.g. --network forgotten) or a non-reverting fallback
  if (result === "0x") {
    throw new HardhatError(HardhatError.ERRORS.CORE.ARGUMENTS.INVALID_VALUE, {
      value: taskArguments.to,
      name: "to",
      reason:
        "the call returned no data; check that it's a contract on the selected network and that it has this function",
    });
  }

  let values: unknown[];
  try {
    values = await decodeAbiParameters(outputs, result);
  } catch (error) {
    ensureError(error);

    if (!isAbiDecodingError(error)) {
      throw error;
    }

    throw new HardhatError(
      HardhatError.ERRORS.CORE.ARGUMENTS.INVALID_VALUE,
      {
        value: taskArguments.signature,
        name: "signature",
        reason: `the return data can't be decoded as its return types: ${error.reason}. Run the command without return types to see the raw data`,
      },
      error,
    );
  }

  // One value per line, like `cast call`
  for (const value of values) {
    console.log(formatAbiValue(value));
  }
};

export default txCallAction;
