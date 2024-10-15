import type { ArtifactMap } from "@ignored/hardhat-vnext/types/artifacts";
import type { ChainType } from "@ignored/hardhat-vnext/types/network";
import type * as viemT from "viem";
import type * as viemOpStackT from "viem/op-stack";

export interface HardhatViemHelpers<ChainTypeT extends ChainType | string> {
  getPublicClient: (
    publicClientConfig?: Partial<viemT.PublicClientConfig>,
  ) => Promise<GetPublicClientReturnType<ChainTypeT>>;
  getWalletClients: (
    walletClientConfig?: Partial<viemT.WalletClientConfig>,
  ) => Promise<Array<GetWalletClientReturnType<ChainTypeT>>>;
  getWalletClient: (
    address: viemT.Address,
    walletClientConfig?: Partial<viemT.WalletClientConfig>,
  ) => Promise<GetWalletClientReturnType<ChainTypeT>>;
  getTestClient: (
    testClientConfig?: Partial<viemT.TestClientConfig>,
  ) => Promise<TestClient>;
  deployContract: <ContractName extends string>(
    contractName: ContractName,
    constructorArgs?: ConstructorArgs<ContractName>,
    config?: DeployContractConfig,
  ) => Promise<ContractReturnType<ContractName>>;
  sendDeploymentTransaction: <ContractName extends string>(
    contractName: ContractName,
    constructorArgs?: ConstructorArgs<ContractName>,
    config?: SendDeploymentTransactionConfig,
  ) => Promise<{
    contract: ContractReturnType<ContractName>;
    deploymentTransaction: GetTransactionReturnType;
  }>;
  getContractAt: <ContractName extends string>(
    contractName: ContractName,
    address: viemT.Address,
    config?: GetContractAtConfig,
  ) => Promise<ContractReturnType<ContractName>>;
}

export type GetPublicClientReturnType<ChainTypeT extends ChainType | string> =
  ChainTypeT extends "optimism" ? OpPublicClient : PublicClient;

export type GetWalletClientReturnType<ChainTypeT extends ChainType | string> =
  ChainTypeT extends "optimism" ? OpWalletClient : WalletClient;

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

export type OpWalletClient = viemT.Client<
  viemT.Transport,
  viemT.Chain,
  viemT.Account,
  viemT.RpcSchema,
  viemOpStackT.WalletActionsL2
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
  [ContractName in keyof ArtifactMap]: ArtifactMap[ContractName] extends never
    ? never
    : ArtifactMap[ContractName]["abi"];
};

export type ConstructorArgs<ContractName> =
  ContractName extends keyof ContractAbis
    ? viemT.ContractConstructorArgs<ContractAbis[ContractName]>
    : unknown[];

export type ContractReturnType<ContractName> =
  ContractName extends keyof ContractAbis
    ? GetContractReturnType<ContractAbis[ContractName]>
    : GetContractReturnType;
