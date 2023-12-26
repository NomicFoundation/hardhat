import type {
  Address,
  PublicClientConfig,
  WalletClientConfig,
  TestClientConfig,
} from "viem";
import type {
  PublicClient,
  TestClient,
  WalletClient,
  deployContract,
  sendDeploymentTransaction,
  getContractAt,
} from "../types";
import "hardhat/types/runtime";
import "hardhat/types/artifacts";

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
      deployContract: typeof deployContract;
      sendDeploymentTransaction: typeof sendDeploymentTransaction;
      getContractAt: typeof getContractAt;
    };
  }
}

declare module "hardhat/types/artifacts" {
  // eslint-disable-next-line @typescript-eslint/no-empty-interface
  interface ArtifactsMap {}

  interface Artifacts {
    readArtifact<ArgT extends keyof ArtifactsMap>(
      contractNameOrFullyQualifiedName: ArgT
    ): Promise<ArtifactsMap[ArgT]>;

    readArtifactSync<ArgT extends keyof ArtifactsMap>(
      contractNameOrFullyQualifiedName: ArgT
    ): ArtifactsMap[ArgT];
  }
}
