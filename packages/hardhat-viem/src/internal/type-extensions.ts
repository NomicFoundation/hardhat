import type { HardhatViemHelpers } from "../types";
import "hardhat/types/runtime";
import "hardhat/types/artifacts";

declare module "hardhat/types/runtime" {
  interface HardhatRuntimeEnvironment {
    viem: HardhatViemHelpers;
  }
}

declare module "hardhat/types/artifacts" {
  // eslint-disable-next-line @typescript-eslint/no-empty-interface
  interface ArtifactsMap {}

  // eslint-disable-next-line @typescript-eslint/no-empty-interface
  interface ContractTypesMap {}

  interface Artifacts {
    readArtifact<ArgT extends keyof ArtifactsMap>(
      contractNameOrFullyQualifiedName: ArgT
    ): Promise<ArtifactsMap[ArgT]>;

    readArtifactSync<ArgT extends keyof ArtifactsMap>(
      contractNameOrFullyQualifiedName: ArgT
    ): ArtifactsMap[ArgT];
  }
}
