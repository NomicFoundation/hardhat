import { EthereumProvider } from "hardhat/types";
import { ChainConfig, EtherscanNetworkEntry } from "../types";
export declare function getEtherscanEndpoints(provider: EthereumProvider, networkName: string, chainConfig: ChainConfig): Promise<EtherscanNetworkEntry>;
export declare function retrieveContractBytecode(address: string, provider: EthereumProvider, networkName: string): Promise<string>;
//# sourceMappingURL=prober.d.ts.map