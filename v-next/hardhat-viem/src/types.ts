import type { ArtifactMap } from "@ignored/hardhat-vnext/types/artifacts";
import type { ChainType } from "@ignored/hardhat-vnext/types/network";
import type * as viemT from "viem";
import type * as viemOpStackT from "viem/op-stack";

export interface HardhatViemHelpers<ChainTypeT extends ChainType | string> {
  /**
   * Creates a public client configured with the provided settings.
   *
   * @param publicClientConfig A viem's PublicClientConfig object with the
   * desired configuration.
   * @returns The configured public client. If the connection's chainType is
   * "optimism", the client will be extended with L2 actions.
   */
  getPublicClient: (
    publicClientConfig?: Partial<viemT.PublicClientConfig>,
  ) => Promise<GetPublicClientReturnType<ChainTypeT>>;
  /**
   * Creates a wallet client configured with the provided settings for each
   * account in the provider.
   *
   * @param walletClientConfig A viem's WalletClientConfig object with the
   * desired configuration.
   * @returns An array with the configured wallet clients. If the connection's
   * chainType is "optimism", the clients will be extended with L2 actions.
   */
  getWalletClients: (
    walletClientConfig?: Partial<viemT.WalletClientConfig>,
  ) => Promise<Array<GetWalletClientReturnType<ChainTypeT>>>;
  /**
   * Creates a wallet client configured with the provided settings for the
   * specified address.
   *
   * @param address The address of the account to create the wallet client for.
   * @param walletClientConfig A viem's WalletClientConfig object with the
   * desired configuration.
   * @returns The configured wallet client for the specified address. If the
   * connection's chainType is "optimism", the client will be extended with L2
   * actions.
   */
  getWalletClient: (
    address: viemT.Address,
    walletClientConfig?: Partial<viemT.WalletClientConfig>,
  ) => Promise<GetWalletClientReturnType<ChainTypeT>>;
  /**
   * Creates a test client configured with the provided settings.
   *
   * @param testClientConfig A viem's TestClientConfig object with the desired
   * configuration.
   * @returns The configured test client.
   */
  getTestClient: (
    testClientConfig?: Partial<viemT.TestClientConfig>,
  ) => Promise<TestClient>;
  /**
   * Deploys a contract with the provided name and constructor arguments and
   * returns the viem's contract instance.
   *
   * @param contractName The name of the contract to deploy. This is required
   * to return the correct contract type.
   * @param constructorArgs The arguments to pass to the contract's constructor.
   * @param deployContractConfig A configuration object. See
   * {@link DeployContractConfig} for more details.
   * @returns The deployed contract instance.
   */
  deployContract: <ContractName extends string>(
    contractName: ContractName,
    constructorArgs?: ConstructorArgs<ContractName>,
    deployContractConfig?: DeployContractConfig,
  ) => Promise<ContractReturnType<ContractName>>;
  /**
   * Sends a deployment transaction for the specified contract and returns the
   * contract instance along with the deployment transaction.
   * The function does not wait for the transaction to be mined.
   *
   * @param contractName The name of the contract to deploy. This is required
   * to return the correct contract type.
   * @param constructorArgs The arguments to pass to the contract's constructor.
   * @param sendDeploymentTransactionConfig A configuration object. See
   * {@link SendDeploymentTransactionConfig} for more details.
   * @returns An object containing the deployed contract instance and the
   * deployment transaction.
   */
  sendDeploymentTransaction: <ContractName extends string>(
    contractName: ContractName,
    constructorArgs?: ConstructorArgs<ContractName>,
    sendDeploymentTransactionConfig?: SendDeploymentTransactionConfig,
  ) => Promise<{
    contract: ContractReturnType<ContractName>;
    deploymentTransaction: GetTransactionReturnType;
  }>;
  /**
   * Returns a contract instance for the specified contract at the provided
   * address.
   *
   * @param contractName The name of the contract to get an instance of. This
   * is required to return the correct contract type.
   * @param address The address of the contract.
   * @param getContractAtConfig A configuration object. See
   * {@link GetContractAtConfig} for more details.
   * @returns The contract instance.
   */
  getContractAt: <ContractName extends string>(
    contractName: ContractName,
    address: viemT.Address,
    getContractAtConfig?: GetContractAtConfig,
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

/**
 * Configuration options for sending a transaction.
 *
 * - `client`: A KeyedClient object with the public and wallet clients to use.
 * If some of them are not provided, the default clients will be used. The
 * default wallet client is the first one returned by `getWalletClients`.
 * - `gas`: The gas limit for the deployment transaction.
 * - `gasPrice`: The gas price for the deployment transaction.
 * - `maxFeePerGas`: The maximum fee per gas for the deployment transaction.
 * - `maxPriorityFeePerGas`: The maximum priority fee per gas for the deployment
 * transaction.
 * - `value`: The value to send with the deployment transaction.
 */
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

/**
 * Configuration options for deploying a contract.
 *
 * - `confirmations`: The number of confirmations to wait for the deployment
 * transaction. Default is 1.
 *
 * - `libraries`: An object with the contract's library names as keys and their
 * addresses as values. This is required if the contract uses libraries to be
 * able to link them.
 *
 * This interface extends {@link SendTransactionConfig}, which includes
 * additional properties such as `client`, `gas`, `gasPrice`, `maxFeePerGas`,
 * `maxPriorityFeePerGas`, and `value`.
 */
export interface DeployContractConfig extends SendTransactionConfig {
  confirmations?: number;
  libraries?: Libraries;
}

export interface SendDeploymentTransactionConfig extends SendTransactionConfig {
  libraries?: Libraries;
}

/**
 * Configuration options for getting a contract instance.
 *
 * - `client`: A KeyedClient object with the public and wallet clients to use.
 * If some of them are not provided, the default clients will be used. The
 * default wallet client is the first one returned by `getWalletClients`. It is
 * mandatory to provide a wallet client if there are no accounts in the
 * provider.
 */
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
