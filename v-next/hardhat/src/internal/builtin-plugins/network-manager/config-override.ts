import type {
  EdrNetworkUserConfig,
  HttpNetworkUserConfig,
  NetworkConfig,
  NetworkConfigOverride,
  NetworkUserConfig,
} from "../../../types/config.js";

/**
 * Converts the NetworkConfigOverride into a valid NetworkUserConfig. This
 * function determines the network type based on the provided `networkConfig`
 * and sets default values for any required properties that are missing from
 * the `networkConfigOverride`.
 *
 * @warning
 * This function is not type-safe. It assumes that `networkConfigOverride` does
 * not contain mixed properties from different network types. Always validate
 * the resulting NetworkUserConfig before using it.
 *
 * @param networkConfigOverride The partial configuration override provided by
 * the user.
 * @param networkConfig The base network configuration used to infer defaults
 * and the network type.
 * @returns A fully resolved NetworkUserConfig with defaults applied.
 */
export async function normalizeNetworkConfigOverride(
  networkConfigOverride: NetworkConfigOverride,
  networkConfig: NetworkConfig,
): Promise<NetworkUserConfig> {
  let networkConfigOverrideWithType: NetworkUserConfig;

  if (networkConfig.type === "http") {
    const networkConfigOverrideAsHttp =
      /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      -- Assumes that networkConfigOverride is a HttpNetworkUserConfig. */
      networkConfigOverride as HttpNetworkUserConfig;

    networkConfigOverrideWithType = {
      ...networkConfigOverrideAsHttp,
      type: "http",
      url: networkConfigOverrideAsHttp.url ?? (await networkConfig.url.get()),
    };
  } else {
    const networkConfigOverrideAsEdr =
      /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      -- Assumes that networkConfigOverride is an EdrNetworkUserConfig. */
      networkConfigOverride as EdrNetworkUserConfig;

    networkConfigOverrideWithType = {
      ...networkConfigOverrideAsEdr,
      type: "edr",
    };
  }

  return networkConfigOverrideWithType;
}
