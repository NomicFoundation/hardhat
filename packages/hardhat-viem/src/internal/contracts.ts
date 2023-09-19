import type {
  EthereumProvider,
  HardhatRuntimeEnvironment,
} from "hardhat/types";
import type { Abi, Address, Hex } from "viem";
import type {
  DeployContractConfig,
  GetContractAtConfig,
  GetContractReturnType,
  PublicClient,
  WalletClient,
} from "./types";

import { getPublicClient, getWalletClients } from "./clients";
import {
  DefaultWalletClientNotFoundError,
  DeployContractError,
} from "./errors";

export async function deployContract(
  hre: HardhatRuntimeEnvironment,
  contractName: string,
  constructorArgs: any[] = [],
  config: DeployContractConfig = {}
): Promise<GetContractReturnType> {
  const { walletClient: configWalletClient, ...deployContractParameters } =
    config;
  const [publicClient, walletClient, contractArtifact] = await Promise.all([
    getPublicClient(hre.network.provider),
    configWalletClient ?? getDefaultWalletClient(hre.network.provider),
    hre.artifacts.readArtifact(contractName),
  ]);

  return innerDeployContract(
    publicClient,
    walletClient,
    contractArtifact.abi,
    contractArtifact.bytecode as Hex,
    constructorArgs,
    deployContractParameters
  );
}

async function innerDeployContract(
  publicClient: PublicClient,
  walletClient: WalletClient,
  contractAbi: Abi,
  contractBytecode: Hex,
  constructorArgs: any[],
  deployContractParameters: DeployContractConfig = {}
): Promise<GetContractReturnType> {
  const deploymentTxHash = await walletClient.deployContract({
    abi: contractAbi,
    bytecode: contractBytecode,
    args: constructorArgs,
    ...deployContractParameters,
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
  config: GetContractAtConfig = {}
): Promise<GetContractReturnType> {
  const [publicClient, walletClient, contractArtifact] = await Promise.all([
    getPublicClient(hre.network.provider),
    config.walletClient ?? getDefaultWalletClient(hre.network.provider),
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
  provider: EthereumProvider
): Promise<WalletClient> {
  const [defaultWalletClient] = await getWalletClients(provider);

  if (defaultWalletClient === undefined) {
    throw new DefaultWalletClientNotFoundError();
  }

  return defaultWalletClient;
}
