import { EthereumProvider } from "@nomiclabs/buidler/types";
import { BuidlerPluginError } from "@nomiclabs/buidler/plugins";
import { pluginName } from "../pluginContext";

type NetworkMap = {
  [networkID in NetworkID]: string;
}

// See https://github.com/ethereum/EIPs/blob/master/EIPS/eip-155.md#list-of-chain-ids
enum NetworkID {
  Mainnet = 1,
  Ropsten = 3,
  Rinkeby = 4,
  Goerli = 5,
  Kovan = 42,
}

const networkIDtoEndpoint: NetworkMap = {
  [NetworkID.Mainnet]: "https://api.etherscan.io/api",
  [NetworkID.Ropsten]: "https://api-ropsten.etherscan.io/api",
  [NetworkID.Rinkeby]: "https://api-rinkeby.etherscan.io/api",
  [NetworkID.Goerli]: "https://api-goerli.etherscan.io/api",
  [NetworkID.Kovan]: "https://api-kovan.etherscan.io/api",
};

export class NetworkProberError extends BuidlerPluginError {
  constructor(message: string) {
    super(pluginName, message);
  }
}

export async function getEtherscanEndpoint(provider: EthereumProvider) {
  const chainID = parseInt(await provider.send("eth_chainId")) as NetworkID;

  const endpoint = networkIDtoEndpoint[chainID];
  if (endpoint) {
    // Beware: this delays URL validation until it is effectively "used".
    // Tests should take this into account.
    return new URL(endpoint);
  } else {
    throw new NetworkProberError(`An etherscan endpoint could not be found for this network. ChainID: ${chainID}`);
  }
}

export async function retrieveContractBytecode(address: string, provider: EthereumProvider): Promise<Buffer | null> {
  const bytecodeString = await provider.send("eth_getCode", [ address, "latest" ]) as string;
  const { hexlify, arrayify } = await import("@ethersproject/bytes");
  const deployedBytecode = Buffer.from(arrayify(hexlify(bytecodeString)));
  if (deployedBytecode.length == 0) {
    return null;
  }
  return deployedBytecode;
}