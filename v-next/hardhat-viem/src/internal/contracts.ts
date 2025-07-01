import type {
  ContractReturnType,
  DeployContractConfig,
  GetContractAtConfig,
  GetTransactionReturnType,
  Libraries,
  PublicClient,
  SendDeploymentTransactionConfig,
  WalletClient,
} from "../types.js";
import type { PrefixedHexString } from "@nomicfoundation/hardhat-utils/hex";
import type { ArtifactManager } from "hardhat/types/artifacts";
import type { EthereumProvider } from "hardhat/types/providers";
import type { Abi as ViemAbi, Address as ViemAddress } from "viem";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import { toBigInt } from "@nomicfoundation/hardhat-utils/bigint";
import { resolveLinkedBytecode } from "@nomicfoundation/hardhat-utils/bytecode";
import { ensureError } from "@nomicfoundation/hardhat-utils/error";
import { getContractAddress, getContract } from "viem";

import { getDefaultWalletClient, getPublicClient } from "./clients.js";

export async function deployContract<ContractName extends string>(
  provider: EthereumProvider,
  artifactManager: ArtifactManager,
  contractName: ContractName,
  constructorArgs: unknown[] = [],
  deployContractConfig: DeployContractConfig = {},
): Promise<ContractReturnType<ContractName>> {
  const {
    client,
    confirmations = 1,
    libraries = {},
    ...deployContractParameters
  } = deployContractConfig;

  if (confirmations < 0) {
    throw new HardhatError(
      HardhatError.ERRORS.HARDHAT_VIEM.GENERAL.INVALID_CONFIRMATIONS,
      {
        error: "Confirmations must be greater than 0.",
      },
    );
  }
  if (confirmations === 0) {
    throw new HardhatError(
      HardhatError.ERRORS.HARDHAT_VIEM.GENERAL.INVALID_CONFIRMATIONS,
      {
        error:
          "deployContract does not support 0 confirmations. Use sendDeploymentTransaction if you want to handle the deployment transaction yourself.",
      },
    );
  }

  const [publicClient, walletClient, { abi, bytecode }] = await Promise.all([
    client?.public ?? getPublicClient(provider, "l1"),
    client?.wallet ?? getDefaultWalletClient(provider, "l1"),
    getContractAbiAndBytecode(artifactManager, contractName, libraries),
  ]);

  let deploymentTxHash: PrefixedHexString;
  // If gasPrice is defined, then maxFeePerGas and maxPriorityFeePerGas
  // must be undefined because it's a legaxy tx.
  if (deployContractParameters.gasPrice !== undefined) {
    deploymentTxHash = await walletClient.deployContract({
      abi,
      bytecode,
      args: constructorArgs,
      ...deployContractParameters,
      maxFeePerGas: undefined,
      maxPriorityFeePerGas: undefined,
    });
  } else {
    deploymentTxHash = await walletClient.deployContract({
      abi,
      bytecode,
      args: constructorArgs,
      ...deployContractParameters,
      gasPrice: undefined,
    });
  }

  const { contractAddress } = await publicClient.waitForTransactionReceipt({
    hash: deploymentTxHash,
    confirmations,
  });

  if (contractAddress === null || contractAddress === undefined) {
    const transaction = await publicClient.getTransaction({
      hash: deploymentTxHash,
    });
    throw new HardhatError(
      HardhatError.ERRORS.HARDHAT_VIEM.GENERAL.DEPLOY_CONTRACT_ERROR,
      {
        txHash: deploymentTxHash,
        blockNumber: transaction.blockNumber,
      },
    );
  }

  const contract = createContractInstance(
    contractName,
    publicClient,
    walletClient,
    abi,
    contractAddress,
  );

  return contract;
}

export async function sendDeploymentTransaction<ContractName extends string>(
  provider: EthereumProvider,
  artifactManager: ArtifactManager,
  contractName: ContractName,
  constructorArgs: unknown[] = [],
  sendDeploymentTransactionConfig: SendDeploymentTransactionConfig = {},
): Promise<{
  contract: ContractReturnType<ContractName>;
  deploymentTransaction: GetTransactionReturnType;
}> {
  const {
    client,
    libraries = {},
    ...deployContractParameters
  } = sendDeploymentTransactionConfig;
  const [publicClient, walletClient, { abi, bytecode }] = await Promise.all([
    client?.public ?? getPublicClient(provider, "l1"),
    client?.wallet ?? getDefaultWalletClient(provider, "l1"),
    getContractAbiAndBytecode(artifactManager, contractName, libraries),
  ]);

  let deploymentTxHash: PrefixedHexString;
  // If gasPrice is defined, then maxFeePerGas and maxPriorityFeePerGas
  // must be undefined because it's a legaxy tx.
  if (deployContractParameters.gasPrice !== undefined) {
    deploymentTxHash = await walletClient.deployContract({
      abi,
      bytecode,
      args: constructorArgs,
      ...deployContractParameters,
      maxFeePerGas: undefined,
      maxPriorityFeePerGas: undefined,
    });
  } else {
    deploymentTxHash = await walletClient.deployContract({
      abi,
      bytecode,
      args: constructorArgs,
      ...deployContractParameters,
      gasPrice: undefined,
    });
  }

  const deploymentTx = await publicClient.getTransaction({
    hash: deploymentTxHash,
  });

  const contractAddress = getContractAddress({
    from: walletClient.account.address,
    nonce: toBigInt(deploymentTx.nonce),
  });

  const contract = createContractInstance(
    contractName,
    publicClient,
    walletClient,
    abi,
    contractAddress,
  );

  return { contract, deploymentTransaction: deploymentTx };
}

export async function getContractAt<ContractName extends string>(
  provider: EthereumProvider,
  artifactManager: ArtifactManager,
  contractName: ContractName,
  address: ViemAddress,
  getContractAtConfig: GetContractAtConfig = {},
): Promise<ContractReturnType<ContractName>> {
  const [publicClient, walletClient, artifact] = await Promise.all([
    getContractAtConfig.client?.public ?? getPublicClient(provider, "l1"),
    getContractAtConfig.client?.wallet ??
      getDefaultWalletClient(provider, "l1"),
    artifactManager.readArtifact(contractName),
  ]);

  return createContractInstance(
    contractName,
    publicClient,
    walletClient,
    artifact.abi,
    address,
  );
}

function createContractInstance<ContractName extends string>(
  _contractName: ContractName,
  publicClient: PublicClient,
  walletClient: WalletClient,
  abi: ViemAbi,
  address: ViemAddress,
): ContractReturnType<ContractName> {
  const contract = getContract({
    address,
    client: {
      public: publicClient,
      wallet: walletClient,
    },
    abi,
  });

  /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  -- Cast it as TS can't infer the type of the contract */
  return contract as ContractReturnType<ContractName>;
}

async function getContractAbiAndBytecode(
  artifacts: ArtifactManager,
  contractName: string,
  libraries: Libraries,
) {
  const artifact = await artifacts.readArtifact(contractName);
  let bytecode;
  try {
    bytecode = resolveLinkedBytecode(artifact, libraries);
  } catch (error) {
    ensureError(error);

    throw new HardhatError(
      HardhatError.ERRORS.HARDHAT_VIEM.GENERAL.LINKING_CONTRACT_ERROR,
      {
        contractName,
        error: error.message,
      },
      error,
    );
  }

  return {
    abi: artifact.abi,
    bytecode,
  };
}
