import {
  HARDHAT_NETWORK_NAME,
  NomicLabsHardhatPluginError,
} from "hardhat/plugins";
import { EthereumProvider } from "hardhat/types";

import { pluginName } from "../constants";
import { ChainConfig, EtherscanNetworkEntry } from "../types";

export async function getEtherscanEndpoints(
  provider: EthereumProvider,
  networkName: string,
  chainConfig: ChainConfig
): Promise<EtherscanNetworkEntry> {
  if (networkName === HARDHAT_NETWORK_NAME) {
    throw new NomicLabsHardhatPluginError(
      pluginName,
      `The selected network is ${networkName}. Please select a network supported by Etherscan.`
    );
  }

  const chainIdsToNames = new Map(
    entries(chainConfig).map(([chainName, config]) => [
      config.chainId,
      chainName,
    ])
  );

  const chainID = parseInt(await provider.send("eth_chainId"), 16);

  const network = chainIdsToNames.get(chainID);

  if (network === undefined) {
    throw new NomicLabsHardhatPluginError(
      pluginName,
      `Unsupported network ("${networkName}", chainId: ${chainID}).`
    );
  }

  const chainConfigEntry = chainConfig[network];

  return { network, urls: chainConfigEntry.urls };
}

export async function retrieveContractBytecode(
  address: string,
  provider: EthereumProvider,
  networkName: string
): Promise<string> {
  const bytecodeString = (await provider.send("eth_getCode", [
    address,
    "latest",
  ])) as string;
  const deployedBytecode = bytecodeString.startsWith("0x")
    ? bytecodeString.slice(2)
    : bytecodeString;
  if (deployedBytecode.length === 0) {
    throw new NomicLabsHardhatPluginError(
      pluginName,
      `The address ${address} has no bytecode. Is the contract deployed to this network?
The selected network is ${networkName}.`
    );
  }
  return deployedBytecode;
}

function entries<O>(o: O) {
  return Object.entries(o) as Array<[keyof O, O[keyof O]]>;
}
