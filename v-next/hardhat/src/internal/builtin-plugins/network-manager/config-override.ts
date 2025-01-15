import type {
  EdrNetworkUserConfig,
  HttpNetworkUserConfig,
  NetworkConfig,
  NetworkConfigOverride,
  NetworkUserConfig,
} from "../../../types/config.js";

import { isObject } from "@ignored/hardhat-vnext-utils/lang";

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

/**
 * Merges two network configurations. This function is used to merge the
 * network configuration with the network configuration override. It recursively
 * merges nested objects.
 *
 * @param target The resolved network configuration.
 * @param source The partial network configuration override provided by the user. It
 * should be resolved and contain only the properties that the user wants to
 * override.
 * @returns A new network configuration object with the override applied.
 */
export function mergeConfigOverride<T extends object>(
  target: T,
  source: Partial<T> = {},
): T {
  const result = { ...target };

  for (const key in source) {
    if (isObject(source[key])) {
      /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      -- result[key] is either an object or undefined, so we default it to {} */
      result[key] = mergeConfigOverride(
        result[key] ?? {},
        source[key],
      ) as T[Extract<keyof T, string>];
    } else {
      /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      -- source[key] could be undefined, but as it is a resolved config as well,
      result[key] should allow it */
      result[key] = source[key] as T[Extract<keyof T, string>];
    }
  }

  return result;
}
