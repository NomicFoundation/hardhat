import type { ArtifactMap } from "hardhat/types/artifacts";
import type { ChainType, DefaultChainType } from "hardhat/types/network";
import type {
  Abi as ViemAbi,
  Account as ViemAccount,
  Address as ViemAddress,
  Chain as ViemChain,
  Client as ViemClient,
  ContractConstructorArgs as ViemContractConstructorArgs,
  createTestClient as ViemCreateTestClient,
  GetContractReturnType as ViemGetContractReturnType,
  GetTransactionReturnType as ViemGetTransactionReturnType,
  PublicClient as ViemPublicClient,
  PublicClientConfig as ViemPublicClientConfig,
  RpcSchema as ViemRpcSchema,
  TestClient as ViemTestClient,
  TestClientConfig as ViemTestClientConfig,
  Transport as ViemTransport,
  WalletClient as ViemWalletClient,
  WalletClientConfig as ViemWalletClientConfig,
  PublicActions as ViemPublicActions,
  WalletActions as ViemWalletActions,
} from "viem";
import type {
  PublicActionsL2 as ViemOpStackPublicActionsL2,
  WalletActionsL2 as ViemOpStackWalletActionsL2,
} from "viem/op-stack";

export interface HardhatViemHelpers<
  ChainTypeT extends ChainType | string = DefaultChainType,
> {
  publicClient: PublicClientType<ChainTypeT>;

  /**
   * Creates a public client configured with the provided settings.
   *
   * @param publicClientConfig A viem's PublicClientConfig object with the
   * desired configuration.
   * @returns The configured public client. If the connection's chainType is
   * "optimism", the client will be extended with L2 actions.
   */
  getPublicClient: (
    publicClientConfig?: Partial<ViemPublicClientConfig>,
  ) => Promise<PublicClientType<ChainTypeT>>;
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
    walletClientConfig?: Partial<ViemWalletClientConfig>,
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
    address: ViemAddress,
    walletClientConfig?: Partial<ViemWalletClientConfig>,
  ) => Promise<GetWalletClientReturnType<ChainTypeT>>;
  /**
   * Creates a test client configured with the provided settings.
   *
   * @param testClientConfig A viem's TestClientConfig object with the desired
   * configuration.
   * @returns The configured test client.
   */
  getTestClient: (
    testClientConfig?: Partial<ViemTestClientConfig>,
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
    address: ViemAddress,
    getContractAtConfig?: GetContractAtConfig,
  ) => Promise<ContractReturnType<ContractName>>;
}

export type PublicClientType<ChainTypeT extends ChainType | string> =
  ChainTypeT extends "optimism" ? OpPublicClient : PublicClient;

export type GetWalletClientReturnType<ChainTypeT extends ChainType | string> =
  ChainTypeT extends "optimism" ? OpWalletClient : WalletClient;

export type PublicClient = ViemPublicClient<ViemTransport, ViemChain>;

export type OpPublicClient = ViemClient<
  ViemTransport,
  ViemChain,
  undefined,
  ViemRpcSchema,
  ViemPublicActions<ViemTransport, ViemChain, ViemAccount> &
    ViemOpStackPublicActionsL2<ViemChain, ViemAccount>
>;

export type WalletClient = ViemWalletClient<
  ViemTransport,
  ViemChain,
  ViemAccount
>;

export type OpWalletClient = ViemClient<
  ViemTransport,
  ViemChain,
  ViemAccount,
  ViemRpcSchema,
  ViemWalletActions<ViemChain, ViemAccount> &
    ViemOpStackWalletActionsL2<ViemChain, ViemAccount>
>;

export type TestClient = ViemTestClient<
  TestClientMode,
  ViemTransport,
  ViemChain
>;

export type TestClientMode = Parameters<typeof ViemCreateTestClient>[0]["mode"];

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
  [libraryName: string]: ViemAddress;
}

/**
 * Configuration options for deploying a contract.
 *
 * - `confirmations`: The number of confirmations to wait for the deployment
 * transaction. Default is 1.
 *
 * - `libraries`: An object with the contract's library names as keys and their
 * addresses as values. This is required if the contract uses libraries,
 * to enable linking.
 *
 * This interface extends {@link SendTransactionConfig}, which includes
 * additional properties such as `client`, `gas`, `gasPrice`, `maxFeePerGas`,
 * `maxPriorityFeePerGas` and `value`.
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
  TAbi extends ViemAbi | readonly unknown[] = ViemAbi,
> = ViemGetContractReturnType<TAbi, Required<KeyedClient>, ViemAddress>;

export type GetTransactionReturnType = ViemGetTransactionReturnType<
  ViemChain,
  "latest"
>;

export type ContractAbis = {
  [ContractName in keyof ArtifactMap]: ArtifactMap[ContractName] extends never
    ? never
    : ArtifactMap[ContractName]["abi"];
};

export type ConstructorArgs<ContractName> =
  ContractName extends keyof ContractAbis
    ? ViemContractConstructorArgs<ContractAbis[ContractName]>
    : unknown[];

export type ContractReturnType<ContractName> =
  ContractName extends keyof ContractAbis
    ? GetContractReturnType<ContractAbis[ContractName]>
    : GetContractReturnType;
