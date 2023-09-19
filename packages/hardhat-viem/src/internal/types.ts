import type * as viemTypes from "viem";

export type PublicClient = viemTypes.PublicClient<
  viemTypes.Transport,
  viemTypes.Chain
>;
export type WalletClient = viemTypes.WalletClient<
  viemTypes.Transport,
  viemTypes.Chain,
  viemTypes.Account
>;
export type TestClient = viemTypes.TestClient<
  TestClientMode,
  viemTypes.Transport,
  viemTypes.Chain
>;

export type TestClientMode = Parameters<
  typeof viemTypes.createTestClient
>[0]["mode"];

export type DeployContractParameters = Omit<
  viemTypes.DeployContractParameters<
    viemTypes.Abi,
    viemTypes.Chain,
    viemTypes.Account
  >,
  "abi" | "bytecode" | "args"
>;

export type DeployContractConfig = DeployContractParameters & {
  walletClient?: WalletClient;
};

export interface GetContractAtConfig {
  walletClient?: WalletClient;
}

export type GetContractReturnType = viemTypes.GetContractReturnType<
  viemTypes.Abi,
  PublicClient,
  WalletClient,
  viemTypes.Address
>;
