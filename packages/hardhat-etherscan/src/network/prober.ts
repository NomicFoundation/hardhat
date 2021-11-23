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
  OPERA = 250,
  FTM_TESTNET = 4002,
  // Optimistim
  OPTIMISTIC_ETHEREUM = 10,
  OPTIMISTIC_KOVAN = 69,
  // Polygon
  POLYGON = 137,
  POLYGON_MUMBAI = 80001,
  // Arbitrum
  ARBITRUM_ONE = 42161,
  ARBITRUM_TESTNET = 421611,
  // Avalanche
  AVALANCHE = 43114,
  AVALANCHE_FUJI_TESTNET = 43113,
  // Moonriver
  MOONRIVER = 1285,
  MOONBASE_ALPHA = 1287,
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
  [NetworkID.FTM_TESTNET]: {
    apiURL: "https://api-testnet.ftmscan.com/api",
    browserURL: "https://testnet.ftmscan.com",
  },
  [NetworkID.OPTIMISTIC_ETHEREUM]: {
    apiURL: "https://api-optimistic.etherscan.io/api",
    browserURL: "https://optimistic.etherscan.io/",
  },
  [NetworkID.OPTIMISTIC_KOVAN]: {
    apiURL: "https://api-kovan-optimistic.etherscan.io/api",
    browserURL: "https://kovan-optimistic.etherscan.io/",
  },
  [NetworkID.POLYGON]: {
    apiURL: "https://api.polygonscan.com/api",
    browserURL: "https://polygonscan.com",
  },
  [NetworkID.POLYGON_MUMBAI]: {
    apiURL: "https://api-testnet.polygonscan.com/api",
    browserURL: "https://mumbai.polygonscan.com/",
  },
  [NetworkID.ARBITRUM_ONE]: {
    apiURL: "https://api.arbiscan.io/api",
    browserURL: "https://arbiscan.io/",
  },
  [NetworkID.ARBITRUM_TESTNET]: {
    apiURL: "https://api-testnet.arbiscan.io/api",
    browserURL: "https://testnet.arbiscan.io/",
  },
  [NetworkID.AVALANCHE]: {
    apiURL: "https://api.snowtrace.io/api",
    browserURL: "https://snowtrace.io/",
  },
  [NetworkID.AVALANCHE_FUJI_TESTNET]: {
    apiURL: "https://api-testnet.snowtrace.io/api",
    browserURL: "https://testnet.snowtrace.io/",
  },
  [NetworkID.MOONRIVER]: {
    apiURL: "https://api-moonriver.moonscan.io/api",
    browserURL: "https://moonscan.io",
  },
  [NetworkID.MOONBASE_ALPHA]: {
    apiURL: "https://api-moonbase.moonscan.io/api",
    browserURL: "https://moonbase.moonscan.io/",
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
