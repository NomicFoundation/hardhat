import type { Dispatcher } from "@nomicfoundation/hardhat-utils/request";
import type {
  BlockExplorerBlockscoutConfig,
  BlockExplorerEtherscanConfig,
  ChainDescriptorsConfig,
  EtherscanConfig,
  SourcifyConfig,
  VerificationProvidersConfig,
} from "hardhat/types/config";
import type { CompilerInput } from "hardhat/types/solidity";

export interface VerificationStatusResponse {
  isPending(): boolean;
  isFailure(): boolean;
  isSuccess(): boolean;
  isAlreadyVerified(): boolean;
  isOk(): boolean;
}

export interface VerificationResponse {
  isBytecodeMissingInNetworkError(): boolean;
  isAlreadyVerified(): boolean;
  isOk(): boolean;
}

export interface ResolveConfigOptions {
  chainId: number;
  networkName: string;
  chainDescriptors: ChainDescriptorsConfig;
  verificationProvidersConfig: VerificationProvidersConfig;
  /**
   * @internal Used for testing only. Allows tests to inject a custom HTTP
   * dispatcher.
   */
  dispatcher?: Dispatcher;
  /**
   * @internal Used for testing only. When false, bypasses the supported
   * chains cache and fetches fresh data from the API.
   */
  shouldUseCache?: boolean;
}

export interface CreateBlockscoutOptions {
  blockExplorerConfig: BlockExplorerBlockscoutConfig;
  dispatcher?: Dispatcher;
  shouldUseCache?: boolean;
}

export interface CreateEtherscanOptions {
  blockExplorerConfig: BlockExplorerEtherscanConfig;
  verificationProviderConfig: EtherscanConfig;
  chainId: number;
  dispatcher?: Dispatcher;
  shouldUseCache?: boolean;
}

export interface CreateSourcifyOptions {
  verificationProviderConfig: SourcifyConfig;
  chainId: number;
  dispatcher?: Dispatcher;
}

export interface VerificationProviderFactory {
  resolveConfig(
    options: ResolveConfigOptions,
  ): Promise<
    CreateEtherscanOptions | CreateBlockscoutOptions | CreateSourcifyOptions
  >;

  create(
    options:
      | CreateEtherscanOptions
      | CreateBlockscoutOptions
      | CreateSourcifyOptions,
  ): Promise<VerificationProvider>;

  getSupportedChains(
    dispatcher?: Dispatcher,
    shouldUseCache?: boolean,
  ): Promise<ChainDescriptorsConfig>;
}

export interface BaseVerifyFunctionArgs {
  contractAddress: string;
  compilerInput: CompilerInput;
  contractName: string;
  compilerVersion: string;
}

export interface VerifyFunctionArgs extends BaseVerifyFunctionArgs {
  /** The constructor arguments (Etherscan & Blockscout only) */
  constructorArguments?: string;
  /** The hash of the contract creation transaction (Sourcify only) */
  creationTxHash?: string;
}

export interface VerificationProvider {
  name: string;
  url: string;
  apiUrl: string;

  getContractUrl(address: string): string;

  isVerified(address: string): Promise<boolean>;

  verify(verifyFunctionArgs: VerifyFunctionArgs): Promise<string>;

  pollVerificationStatus(
    guid: string,
    contractAddress: string,
    contractName: string,
  ): Promise<{
    success: boolean;
    message: string;
  }>;
}
