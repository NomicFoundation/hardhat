import { NetworkConfig, ResolvedBuidlerConfig } from "../../types";
import { BuidlerError, ERRORS } from "../errors";

export function getNetworkConfig(
  config: ResolvedBuidlerConfig,
  selectedNetwork: string
): NetworkConfig {
  if (config.networks[selectedNetwork] === undefined) {
    throw new BuidlerError(ERRORS.NETWORK_CONFIG_NOT_FOUND, selectedNetwork);
  }

  return config.networks[selectedNetwork];
}
