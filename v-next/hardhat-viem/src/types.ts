import type { ContractArtifacts } from "@ignored/hardhat-vnext/types/artifacts";
import type { ChainType } from "@ignored/hardhat-vnext/types/network";
import type * as viemT from "viem";
import type * as viemOpStackT from "viem/op-stack";

export interface HardhatViemHelpers<ChainTypeT extends ChainType | string> {
  getPublicClient: (
    publicClientConfig?: Partial<viemT.PublicClientConfig>,
  ) => Promise<GetPublicClientReturnType<ChainTypeT>>;
  getWalletClients: typeof getWalletClients;
  getWalletClient: typeof getWalletClient;
  getTestClient: typeof getTestClient;
  deployContract: typeof deployContract;
  sendDeploymentTransaction: typeof sendDeploymentTransaction;
  getContractAt: typeof getContractAt;
}

export type GetPublicClientReturnType<ChainTypeT extends ChainType | string> =
  ChainTypeT extends "optimism" ? OpPublicClient : PublicClient;

export declare function getWalletClients(
  walletClientConfig?: Partial<viemT.WalletClientConfig>,
): Promise<WalletClient[]>;

export declare function getWalletClient(
  address: viemT.Address,
  walletClientConfig?: Partial<viemT.WalletClientConfig>,
): Promise<WalletClient>;

export declare function getTestClient(
  testClientConfig?: Partial<viemT.TestClientConfig>,
): Promise<TestClient>;

export declare function deployContract<ContractName extends string>(
  contractName: ContractName,
  constructorArgs?: ConstructorArgs<ContractName>,
  config?: DeployContractConfig,
): Promise<ContractReturnType<ContractName>>;

export declare function sendDeploymentTransaction<ContractName extends string>(
  contractName: ContractName,
  constructorArgs?: ConstructorArgs<ContractName>,
  config?: SendDeploymentTransactionConfig,
): Promise<{
  contract: ContractReturnType<ContractName>;
  deploymentTransaction: GetTransactionReturnType;
}>;

export declare function getContractAt<ContractName extends string>(
  contractName: ContractName,
  address: viemT.Address,
  config?: GetContractAtConfig,
): Promise<ContractReturnType<ContractName>>;

export type PublicClient = viemT.PublicClient<viemT.Transport, viemT.Chain>;

export type OpPublicClient = viemT.Client<
  viemT.Transport,
  viemT.Chain,
  viemT.Account,
  viemT.RpcSchema,
  viemOpStackT.PublicActionsL2
>;

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
  client?: KeyedClient;
  gas?: bigint;
  gasPrice?: bigint;
  maxFeePerGas?: bigint;
  maxPriorityFeePerGas?: bigint;
  value?: bigint;
}

export type KeyedClient =
  | {
      public?: PublicClient;
      wallet: WalletClient;
    }
  | {
      public: PublicClient;
      wallet?: WalletClient;
    };

export interface Libraries {
  [libraryName: string]: viemT.Address;
}

export interface DeployContractConfig extends SendTransactionConfig {
  confirmations?: number;
  libraries?: Libraries;
}

export interface SendDeploymentTransactionConfig extends SendTransactionConfig {
  libraries?: Libraries;
}

export interface GetContractAtConfig {
  client?: KeyedClient;
}

export type GetContractReturnType<
  TAbi extends viemT.Abi | readonly unknown[] = viemT.Abi,
> = viemT.GetContractReturnType<TAbi, Required<KeyedClient>, viemT.Address>;

export type GetTransactionReturnType = viemT.GetTransactionReturnType<
  viemT.Chain,
  "latest"
>;

export type ContractAbis = {
  [ContractName in keyof ContractArtifacts]: ContractArtifacts[ContractName] extends never
    ? never
    : ContractArtifacts[ContractName]["abi"];
};

export type ConstructorArgs<ContractName> =
  ContractName extends keyof ContractAbis
    ? viemT.ContractConstructorArgs<ContractAbis[ContractName]>
    : unknown[];

export type ContractReturnType<ContractName> =
  ContractName extends keyof ContractAbis
    ? GetContractReturnType<ContractAbis[ContractName]>
    : GetContractReturnType;
