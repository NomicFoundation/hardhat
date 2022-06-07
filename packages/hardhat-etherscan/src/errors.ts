import { NomicLabsHardhatPluginError } from "hardhat/plugins";

import { pluginName } from "./constants";

export function throwUnsupportedNetwork(
  networkName: string,
  chainID: number
): never {
  const message = `
Trying to verify a contract in a network with chain id ${chainID}, but the plugin doesn't recognize it as a supported chain.

You can manually add support for it by following these instructions: https://hardhat.org/verify-custom-networks

To see the list of supported networks, run this command:

  npx hardhat verify --list-networks`.trimStart();

  throw new NomicLabsHardhatPluginError(pluginName, message);
}
