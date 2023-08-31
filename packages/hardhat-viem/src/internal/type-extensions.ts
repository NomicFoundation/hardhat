import type {
  Address,
  PublicClientConfig,
  WalletClientConfig,
  TestClientConfig,
} from "viem";
import type {
  DeployContractConfig,
  GetContractAtConfig,
  GetContractReturnType,
  PublicClient,
  TestClient,
  WalletClient,
} from "./types";
import "hardhat/types/runtime";

declare module "hardhat/types/runtime" {
  interface HardhatRuntimeEnvironment {
    viem: {
      getPublicClient(
        publicClientConfig?: Partial<PublicClientConfig>
      ): Promise<PublicClient>;
      getWalletClients(
        walletClientConfig?: Partial<WalletClientConfig>
      ): Promise<WalletClient[]>;
      getWalletClient(
        address: Address,
        walletClientConfig?: Partial<WalletClientConfig>
      ): Promise<WalletClient>;
      getTestClient(
        testClientConfig?: Partial<TestClientConfig>
      ): Promise<TestClient>;
      deployContract(
        contractName: string,
        constructorArgs?: any[],
        config?: DeployContractConfig
      ): Promise<GetContractReturnType>;
      getContractAt(
        contractName: string,
        address: Address,
        config?: GetContractAtConfig
      ): Promise<GetContractReturnType>;
    };
  }
}
