import type * as viemT from "viem";
import type { ArtifactsMap } from "hardhat/types/artifacts";
import type { Libraries } from "./internal/bytecode";

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

export type KeyedClient =
  | {
      public?: PublicClient;
      wallet: WalletClient;
    }
  | {
      public: PublicClient;
      wallet?: WalletClient;
    };

export type TestClientMode = Parameters<
  typeof viemT.createTestClient
>[0]["mode"];

export interface SendTransactionConfig {
  client?: KeyedClient;
  gas?: bigint;
  gasPrice?: bigint;
  maxFeePerGas?: bigint;
  maxPriorityFeePerGas?: bigint;
  value?: bigint;
}

export interface DeployContractConfig extends SendTransactionConfig {
  confirmations?: number;
  libraries?: Libraries<viemT.Address>;
}

export interface SendDeploymentTransactionConfig extends SendTransactionConfig {
  libraries?: Libraries<viemT.Address>;
}

export interface GetContractAtConfig {
  client?: KeyedClient;
}

export type GetContractReturnType<
  TAbi extends viemT.Abi | readonly unknown[] = viemT.Abi
> = viemT.GetContractReturnType<TAbi, Required<KeyedClient>, viemT.Address>;

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

export interface HardhatViemHelpers {
  getPublicClient(
    publicClientConfig?: Partial<viemT.PublicClientConfig>
  ): Promise<PublicClient>;
  getWalletClients(
    walletClientConfig?: Partial<viemT.WalletClientConfig>
  ): Promise<WalletClient[]>;
  getWalletClient(
    address: viemT.Address,
    walletClientConfig?: Partial<viemT.WalletClientConfig>
  ): Promise<WalletClient>;
  getTestClient(
    testClientConfig?: Partial<viemT.TestClientConfig>
  ): Promise<TestClient>;
  deployContract: typeof deployContract;
  sendDeploymentTransaction: typeof sendDeploymentTransaction;
  getContractAt: typeof getContractAt;
}

export type { AbiParameterToPrimitiveType } from "abitype";
