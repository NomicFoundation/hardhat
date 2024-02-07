import type * as viemT from "viem";
import type { ArtifactsMap } from "hardhat/types/artifacts";

export type PublicClient = viemT.PublicClient<viemT.Transport, viemT.Chain>;

export type WalletClient = viemT.WalletClient<
  viemT.Transport,
  viemT.Chain,
  viemT.Account
>;
export type TestClient = viemT.TestClient<
  TestClientMode,
  viemT.Transport,
  viemT.Chain
>;

export type TestClientMode = Parameters<
  typeof viemT.createTestClient
>[0]["mode"];

export interface SendTransactionConfig {
  walletClient?: WalletClient;
  publicClient?: PublicClient;
  gas?: bigint;
  gasPrice?: bigint;
  maxFeePerGas?: bigint;
  maxPriorityFeePerGas?: bigint;
  value?: bigint;
}

export interface DeployContractConfig extends SendTransactionConfig {
  confirmations?: number;
}

export type SendDeploymentTransactionConfig = SendTransactionConfig;

export interface GetContractAtConfig {
  walletClient?: WalletClient;
  publicClient?: PublicClient;
}

export type GetContractReturnType<
  TAbi extends viemT.Abi | readonly unknown[] = viemT.Abi
> = viemT.GetContractReturnType<
  TAbi,
  {
    public: PublicClient;
    wallet: WalletClient;
  },
  viemT.Address
>;

export type GetTransactionReturnType = viemT.GetTransactionReturnType<
  viemT.Chain,
  "latest"
>;

export type ContractName<StringT extends string> =
  StringT extends keyof ArtifactsMap ? never : StringT;

export declare function deployContract<CN extends string>(
  contractName: ContractName<CN>,
  constructorArgs?: any[],
  config?: DeployContractConfig
): Promise<GetContractReturnType>;

export declare function sendDeploymentTransaction<CN extends string>(
  contractName: ContractName<CN>,
  constructorArgs?: any[],
  config?: SendDeploymentTransactionConfig
): Promise<{
  contract: GetContractReturnType;
  deploymentTransaction: GetTransactionReturnType;
}>;

export declare function getContractAt<CN extends string>(
  contractName: ContractName<CN>,
  address: viemT.Address,
  config?: GetContractAtConfig
): Promise<GetContractReturnType>;

export type { AbiParameterToPrimitiveType } from "abitype";
