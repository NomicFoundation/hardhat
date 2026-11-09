import type { NetworkConnection } from "../../../../types/network.js";
import type { UtilsHardhatRuntimeEnvironment } from "../types.js";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import { ensureError } from "@nomicfoundation/hardhat-utils/error";

import { ProviderError } from "../../network-manager/provider-errors.js";

/**
 * Creates a connection to the selected network, runs `fn` with it, and closes
 * it afterwards, even if `fn` throws.
 */
export async function withConnection<T>(
  hre: UtilsHardhatRuntimeEnvironment,
  fn: (connection: NetworkConnection) => Promise<T>,
): Promise<T> {
  const connection = await hre.network.create();

  try {
    return await fn(connection);
  } catch (error) {
    ensureError(error);

    // Errors with a numeric code, like an unknown method, a revert or a rejected
    // API key, are the network's answer to the request, not a Hardhat bug.
    if (!("code" in error) || typeof error.code !== "number") {
      throw error;
    }

    // Remote nodes return a revert's data apart from its message. EDR throws
    // reverts as SolidityErrors instead, whose message already decodes it.
    const data =
      ProviderError.isProviderError(error) && typeof error.data === "string"
        ? `, data: "${error.data}"`
        : "";

    throw new HardhatError(
      HardhatError.ERRORS.CORE.NETWORK.JSON_RPC_REQUEST_FAILED,
      { code: error.code, message: `${error.message}${data}` },
      error,
    );
  } finally {
    await connection.close();
  }
}
