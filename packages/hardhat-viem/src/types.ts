import type * as viemT from "viem";

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
  gas?: bigint | undefined;
  value?: bigint | undefined;
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

export declare function deployContract(
  contractName: string,
  constructorArgs?: any[],
  config?: DeployContractConfig
): Promise<GetContractReturnType>;

export declare function getContractAt(
  contractName: string,
  address: viemT.Address,
  config?: GetContractAtConfig
): Promise<GetContractReturnType>;
