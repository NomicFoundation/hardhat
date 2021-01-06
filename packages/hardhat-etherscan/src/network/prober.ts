import { NomicLabsHardhatPluginError } from "hardhat/plugins";
import { EthereumProvider } from "hardhat/types";

import { pluginName } from "../constants";

type NetworkMap = {
  [networkID in NetworkID]: string;
};

// See https://github.com/ethereum/EIPs/blob/master/EIPS/eip-155.md#list-of-chain-ids
enum NetworkID {
  MAINNET = 1,
  ROPSTEN = 3,
  RINKEBY = 4,
  GOERLI = 5,
  KOVAN = 42,
}

const networkIDtoEndpoint: NetworkMap = {
  [NetworkID.MAINNET]: "https://api.etherscan.io/api",
  [NetworkID.ROPSTEN]: "https://api-ropsten.etherscan.io/api",
  [NetworkID.RINKEBY]: "https://api-rinkeby.etherscan.io/api",
  [NetworkID.GOERLI]: "https://api-goerli.etherscan.io/api",
  [NetworkID.KOVAN]: "https://api-kovan.etherscan.io/api",
};

export async function getEtherscanEndpoint(
  provider: EthereumProvider,
  networkName: string
): Promise<string> {
  const chainID = parseInt(await provider.send("eth_chainId"), 16) as NetworkID;

  const endpoint = networkIDtoEndpoint[chainID];

  if (endpoint === undefined) {
    throw new NomicLabsHardhatPluginError(
      pluginName,
      `An etherscan endpoint could not be found for this network. ChainID: ${chainID}. The selected network is ${networkName}.

Possible causes are:
  - The selected network (${networkName}) is wrong.
  - Faulty hardhat network config.`
    );
  }

  return endpoint;
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
