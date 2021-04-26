import {
  HARDHAT_NETWORK_NAME,
  NomicLabsHardhatPluginError,
} from "hardhat/plugins";
import { EthereumProvider } from "hardhat/types";

import { pluginName } from "../constants";

export interface EtherscanURLs {
  apiURL: string;
  browserURL: string;
}

type NetworkMap = {
  [networkID in NetworkID]: EtherscanURLs;
};

// See https://github.com/ethereum/EIPs/blob/master/EIPS/eip-155.md#list-of-chain-ids
enum NetworkID {
  MAINNET = 1,
  ROPSTEN = 3,
  RINKEBY = 4,
  GOERLI = 5,
  KOVAN = 42,
  // Binance Smart Chain
  BSC = 56,
  BSC_TESTNET = 97,
  // Huobi ECO Chain
  HECO = 128,
  HECO_TESTNET = 256,
  // Fantom mainnet
  OPERA = 250
}

const networkIDtoEndpoints: NetworkMap = {
  [NetworkID.MAINNET]: {
    apiURL: "https://api.etherscan.io/api",
    browserURL: "https://etherscan.io",
  },
  [NetworkID.ROPSTEN]: {
    apiURL: "https://api-ropsten.etherscan.io/api",
    browserURL: "https://ropsten.etherscan.io",
  },
  [NetworkID.RINKEBY]: {
    apiURL: "https://api-rinkeby.etherscan.io/api",
    browserURL: "https://rinkeby.etherscan.io",
  },
  [NetworkID.GOERLI]: {
    apiURL: "https://api-goerli.etherscan.io/api",
    browserURL: "https://goerli.etherscan.io",
  },
  [NetworkID.KOVAN]: {
    apiURL: "https://api-kovan.etherscan.io/api",
    browserURL: "https://kovan.etherscan.io",
  },
  [NetworkID.BSC]: {
    apiURL: "https://api.bscscan.com/api",
    browserURL: "https://bscscan.com",
  },
  [NetworkID.BSC_TESTNET]: {
    apiURL: "https://api-testnet.bscscan.com/api",
    browserURL: "https://testnet.bscscan.com",
  },
  [NetworkID.HECO]: {
    apiURL: "https://api.hecoinfo.com/api",
    browserURL: "https://hecoinfo.com",
  },
  [NetworkID.HECO_TESTNET]: {
    apiURL: "https://api-testnet.hecoinfo.com/api",
    browserURL: "https://testnet.hecoinfo.com",
  },
  [NetworkID.OPERA]: {
    apiURL: "https://api.ftmscan.com/api",
    browserURL: "https://ftmscan.com",
  },
};

export async function getEtherscanEndpoints(
  provider: EthereumProvider,
  networkName: string
): Promise<EtherscanURLs> {
  if (networkName === HARDHAT_NETWORK_NAME) {
    throw new NomicLabsHardhatPluginError(
      pluginName,
      `The selected network is ${networkName}. Please select a network supported by Etherscan.`
    );
  }

  const chainID = parseInt(await provider.send("eth_chainId"), 16) as NetworkID;

  const endpoints = networkIDtoEndpoints[chainID];

  if (endpoints === undefined) {
    throw new NomicLabsHardhatPluginError(
      pluginName,
      `An etherscan endpoint could not be found for this network. ChainID: ${chainID}. The selected network is ${networkName}.

Possible causes are:
  - The selected network (${networkName}) is wrong.
  - Faulty hardhat network config.`
    );
  }

  return endpoints;
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
