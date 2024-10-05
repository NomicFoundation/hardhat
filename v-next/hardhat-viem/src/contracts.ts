import type {
  ContractReturnType,
  DeployContractConfig,
  GetContractAtConfig,
  GetTransactionReturnType,
  SendDeploymentTransactionConfig,
} from "./types.js";
import type { ArtifactsManager } from "@ignored/hardhat-vnext/types/artifacts";
import type { ChainType } from "@ignored/hardhat-vnext/types/network";
import type { EthereumProvider } from "@ignored/hardhat-vnext/types/providers";

export async function deployContract<
  ChainTypeT extends ChainType | string,
  ContractName extends string,
>(
  provider: EthereumProvider,
  artifactManager: ArtifactsManager,
  chainType: ChainTypeT,
  contractName: ContractName,
  constructorArgs: unknown[] = [],
  deployContractConfig: DeployContractConfig = {},
): Promise<ContractReturnType<ContractName>> {
  // ...
}

export async function sendDeploymentTransaction<
  ChainTypeT extends ChainType | string,
  ContractName extends string,
>(
  provider: EthereumProvider,
  artifactManager: ArtifactsManager,
  chainType: ChainTypeT,
  contractName: ContractName,
  constructorArgs: unknown[] = [],
  sendDeploymentTransactionConfig: SendDeploymentTransactionConfig = {},
): Promise<{
  contract: ContractReturnType<ContractName>;
  deploymentTransaction: GetTransactionReturnType;
}> {
  // ...
}

export async function getContractAt<
  ChainTypeT extends ChainType | string,
  ContractName extends string,
>(
  provider: EthereumProvider,
  artifactManager: ArtifactsManager,
  chainType: ChainTypeT,
  contractName: ContractName,
  address: string,
  getContractAtConfig: GetContractAtConfig = {},
): Promise<ContractReturnType<ContractName>> {
  // ...
}
