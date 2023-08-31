import type {
  EthereumProvider,
  HardhatRuntimeEnvironment,
} from "hardhat/types";
import type { Abi, Address, GetContractReturnType, Hex } from "viem";
import type { ContractConfig, PublicClient, WalletClient } from "./types";

import { getPublicClient, getWalletClients } from "./clients";
import {
  DefaultWalletClientNotFoundError,
  DeployContractError,
} from "./errors";

export async function deployContract(
  hre: HardhatRuntimeEnvironment,
  contractName: string,
  constructorArgs: any[] = [],
  config: Partial<ContractConfig> = {}
): Promise<GetContractReturnType> {
  const [publicClient, walletClient, contractArtifact] = await Promise.all([
    getPublicClient(hre.network.provider),
    getDefaultWalletClient(hre.network.provider, config),
    hre.artifacts.readArtifact(contractName),
  ]);

  return innerDeployContract(
    publicClient,
    walletClient,
    contractArtifact.abi,
    contractArtifact.bytecode as Hex,
    constructorArgs
  );
}

async function innerDeployContract(
  publicClient: PublicClient,
  walletClient: WalletClient,
  contractAbi: Abi,
  contractBytecode: Hex,
  constructorArgs: any[]
): Promise<GetContractReturnType> {
  const deploymentTxHash = await walletClient.deployContract({
    abi: contractAbi,
    bytecode: contractBytecode,
    args: constructorArgs,
  });

  const { contractAddress } = await publicClient.waitForTransactionReceipt({
    hash: deploymentTxHash,
  });

  if (contractAddress === null) {
    throw new DeployContractError();
  }

  const contract = await innerGetContractAt(
    publicClient,
    walletClient,
    contractAbi,
    contractAddress
  );

  return contract;
}

export async function getContractAt(
  hre: HardhatRuntimeEnvironment,
  contractName: string,
  address: Address,
  config: Partial<ContractConfig> = {}
): Promise<GetContractReturnType> {
  const [publicClient, walletClient, contractArtifact] = await Promise.all([
    getPublicClient(hre.network.provider),
    getDefaultWalletClient(hre.network.provider, config),
    hre.artifacts.readArtifact(contractName),
  ]);

  return innerGetContractAt(
    publicClient,
    walletClient,
    contractArtifact.abi,
    address
  );
}

async function innerGetContractAt(
  publicClient: PublicClient,
  walletClient: WalletClient,
  contractAbi: Abi,
  address: Address
): Promise<GetContractReturnType> {
  const viem = await import("viem");
  const contract = viem.getContract({
    address,
    publicClient,
    walletClient,
    abi: contractAbi,
  });

  return contract;
}

async function getDefaultWalletClient(
  provider: EthereumProvider,
  config: Partial<ContractConfig>
): Promise<WalletClient> {
  if (config.walletClient !== undefined) {
    return config.walletClient;
  }
  const [defaultWalletClient] = await getWalletClients(provider);

  if (defaultWalletClient === undefined) {
    throw new DefaultWalletClientNotFoundError();
  }

  return defaultWalletClient;
}
