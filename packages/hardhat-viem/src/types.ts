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

export interface DeployContractConfig {
  walletClient?: WalletClient;
  gas?: bigint;
  value?: bigint;
  confirmations?: number;
}

export interface GetContractAtConfig {
  walletClient?: WalletClient;
}

export type GetContractReturnType<
  TAbi extends viemT.Abi | readonly unknown[] = viemT.Abi
> = viemT.GetContractReturnType<
  TAbi,
  PublicClient,
  WalletClient,
  viemT.Address
>;

export type ContractName<StringT extends string> =
  StringT extends keyof ArtifactsMap ? never : StringT;

export declare function deployContract<CN extends string>(
  contractName: ContractName<CN>,
  constructorArgs?: any[],
  config?: DeployContractConfig
): Promise<GetContractReturnType>;

export declare function getContractAt<CN extends string>(
  contractName: ContractName<CN>,
  address: viemT.Address,
  config?: GetContractAtConfig
): Promise<GetContractReturnType>;
