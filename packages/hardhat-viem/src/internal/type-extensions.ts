import type {
  Address,
  PublicClientConfig,
  WalletClientConfig,
  TestClientConfig,
  GetContractReturnType,
} from "viem";
import type {
  ContractConfig,
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
        config?: Partial<ContractConfig>
      ): Promise<GetContractReturnType>;
      getContractAt(
        contractName: string,
        address: Address,
        config?: Partial<ContractConfig>
      ): Promise<GetContractReturnType>;
    };
  }
}
