import type {
  EthereumProvider,
  HardhatRuntimeEnvironment,
  Network,
} from "hardhat/types";
import type { Abi, Address, Hex } from "viem";
import type {
  DeployContractConfig,
  GetContractAtConfig,
  GetContractReturnType,
  GetTransactionReturnType,
  PublicClient,
  SendDeploymentTransactionConfig,
  WalletClient,
} from "../types";

import { Libraries, resolveBytecodeWithLinkedLibraries } from "./bytecode";
import { getPublicClient, getWalletClients } from "./clients";
import {
  DefaultWalletClientNotFoundError,
  DeployContractError,
  HardhatViemError,
  InvalidConfirmationsError,
} from "./errors";

async function getContractAbiAndBytecode(
  artifacts: HardhatRuntimeEnvironment["artifacts"],
  contractName: string,
  libraries: Libraries<Address>
) {
  const artifact = await artifacts.readArtifact(contractName);
  const bytecode = await resolveBytecodeWithLinkedLibraries(
    artifact,
    libraries
  );

  return {
    abi: artifact.abi,
    bytecode,
  };
}

export async function deployContract(
  { artifacts, network }: HardhatRuntimeEnvironment,
  contractName: string,
  constructorArgs: any[] = [],
  config: DeployContractConfig = {}
): Promise<GetContractReturnType> {
  const {
    client,
    confirmations,
    libraries = {},
    ...deployContractParameters
  } = config;
  const [publicClient, walletClient, { abi, bytecode }] = await Promise.all([
    client?.public ?? getPublicClient(network),
    client?.wallet ?? getDefaultWalletClient(network),
    getContractAbiAndBytecode(artifacts, contractName, libraries),
  ]);

  return innerDeployContract(
    publicClient,
    walletClient,
    abi,
    bytecode,
    constructorArgs,
    deployContractParameters,
    confirmations
  );
}

export async function innerDeployContract(
  publicClient: PublicClient,
  walletClient: WalletClient,
  contractAbi: Abi,
  contractBytecode: Hex,
  constructorArgs: any[],
  deployContractParameters: DeployContractConfig = {},
  confirmations: number = 1
): Promise<GetContractReturnType> {
  let deploymentTxHash: Hex;
  // If gasPrice is defined, then maxFeePerGas and maxPriorityFeePerGas
  // must be undefined because it's a legaxy tx.
  if (deployContractParameters.gasPrice !== undefined) {
    deploymentTxHash = await walletClient.deployContract({
      abi: contractAbi,
      bytecode: contractBytecode,
      args: constructorArgs,
      ...deployContractParameters,
      maxFeePerGas: undefined,
      maxPriorityFeePerGas: undefined,
    });
  } else {
    deploymentTxHash = await walletClient.deployContract({
      abi: contractAbi,
      bytecode: contractBytecode,
      args: constructorArgs,
      ...deployContractParameters,
      gasPrice: undefined,
    });
  }

  if (confirmations < 0) {
    throw new HardhatViemError("Confirmations must be greater than 0.");
  }
  if (confirmations === 0) {
    throw new InvalidConfirmationsError();
  }

  const { contractAddress } = await publicClient.waitForTransactionReceipt({
    hash: deploymentTxHash,
    confirmations,
  });

  if (contractAddress === null || contractAddress === undefined) {
    const transaction = await publicClient.getTransaction({
      hash: deploymentTxHash,
    });
    throw new DeployContractError(deploymentTxHash, transaction.blockNumber);
  }

  const contract = await innerGetContractAt(
    publicClient,
    walletClient,
    contractAbi,
    contractAddress
  );

  return contract;
}

export async function sendDeploymentTransaction(
  { artifacts, network }: HardhatRuntimeEnvironment,
  contractName: string,
  constructorArgs: any[] = [],
  config: SendDeploymentTransactionConfig = {}
): Promise<{
  contract: GetContractReturnType;
  deploymentTransaction: GetTransactionReturnType;
}> {
  const { client, libraries = {}, ...deployContractParameters } = config;
  const [publicClient, walletClient, { abi, bytecode }] = await Promise.all([
    client?.public ?? getPublicClient(network),
    client?.wallet ?? getDefaultWalletClient(network),
    getContractAbiAndBytecode(artifacts, contractName, libraries),
  ]);

  return innerSendDeploymentTransaction(
    publicClient,
    walletClient,
    abi,
    bytecode,
    constructorArgs,
    deployContractParameters
  );
}

async function innerSendDeploymentTransaction(
  publicClient: PublicClient,
  walletClient: WalletClient,
  contractAbi: Abi,
  contractBytecode: Hex,
  constructorArgs: any[],
  deployContractParameters: SendDeploymentTransactionConfig = {}
): Promise<{
  contract: GetContractReturnType;
  deploymentTransaction: GetTransactionReturnType;
}> {
  let deploymentTxHash: Hex;
  // If gasPrice is defined, then maxFeePerGas and maxPriorityFeePerGas
  // must be undefined because it's a legaxy tx.
  if (deployContractParameters.gasPrice !== undefined) {
    deploymentTxHash = await walletClient.deployContract({
      abi: contractAbi,
      bytecode: contractBytecode,
      args: constructorArgs,
      ...deployContractParameters,
      maxFeePerGas: undefined,
      maxPriorityFeePerGas: undefined,
    });
  } else {
    deploymentTxHash = await walletClient.deployContract({
      abi: contractAbi,
      bytecode: contractBytecode,
      args: constructorArgs,
      ...deployContractParameters,
      gasPrice: undefined,
    });
  }

  const deploymentTx = await publicClient.getTransaction({
    hash: deploymentTxHash,
  });

  const { getContractAddress } = await import("viem");
  const contractAddress = getContractAddress({
    from: walletClient.account.address,
    nonce: BigInt(deploymentTx.nonce),
  });

  const contract = await innerGetContractAt(
    publicClient,
    walletClient,
    contractAbi,
    contractAddress
  );

  return { contract, deploymentTransaction: deploymentTx };
}

export async function getContractAt(
  { artifacts, network }: HardhatRuntimeEnvironment,
  contractName: string,
  address: Address,
  config: GetContractAtConfig = {}
): Promise<GetContractReturnType> {
  const [publicClient, walletClient, contractArtifact] = await Promise.all([
    config.client?.public ?? getPublicClient(network),
    config.client?.wallet ??
      getDefaultWalletClient(network),
    artifacts.readArtifact(contractName),
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
    client: {
      public: publicClient,
      wallet: walletClient,
    },
    abi: contractAbi,
  });

  return contract;
}

async function getDefaultWalletClient(
  network: Network
): Promise<WalletClient> {
  const networkName = network.name;
  const [defaultWalletClient] = await getWalletClients(network);

  if (defaultWalletClient === undefined) {
    throw new DefaultWalletClientNotFoundError(networkName);
  }

  return defaultWalletClient;
}
