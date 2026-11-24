import type { NetworkConnection } from "../../../../types/network.js";
import type { UtilsHardhatRuntimeEnvironment } from "../types.js";
import type { PrefixedHexString } from "@nomicfoundation/hardhat-utils/hex";

import {
  HardhatError,
  assertHardhatInvariant,
} from "@nomicfoundation/hardhat-errors";
import { ensureError } from "@nomicfoundation/hardhat-utils/error";
import {
  hexStringToBigInt,
  isHexString,
  isPrefixedHexString,
} from "@nomicfoundation/hardhat-utils/hex";

import { ProviderError } from "../../network-manager/provider-errors.js";

/**
 * Creates a connection to the selected network, runs `fn` with it, and closes
 * it afterwards, even if `fn` throws.
 *
 * A read-only connection drops the network's accounts, so they are never
 * resolved: a keystore-backed private key would prompt for the password.
 */
export async function withConnection<T>(
  hre: UtilsHardhatRuntimeEnvironment,
  fn: (connection: NetworkConnection) => Promise<T>,
  { readOnly = false }: { readOnly?: boolean } = {},
): Promise<T> {
  const connection = await hre.network.create(
    readOnly ? { override: { accounts: [] } } : undefined,
  );

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

/** Sends a request whose result is 0x-prefixed hex, and returns it. */
export async function requestHex(
  hre: UtilsHardhatRuntimeEnvironment,
  method: string,
  params?: unknown[],
): Promise<PrefixedHexString> {
  const result = await withConnection(
    hre,
    async (connection) => await connection.provider.request({ method, params }),
  );

  assertHardhatInvariant(
    typeof result === "string" &&
      isPrefixedHexString(result) &&
      isHexString(result),
    `${method} should return a hex string`,
  );

  return result;
}

/** Sends a request whose result is a hex quantity, and returns it as a bigint. */
export async function requestQuantity(
  hre: UtilsHardhatRuntimeEnvironment,
  method: string,
  params?: unknown[],
): Promise<bigint> {
  return hexStringToBigInt(await requestHex(hre, method, params));
}
