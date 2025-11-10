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
  dispatcher?: Dispatcher;
}

export interface CreateBlockscoutOptions {
  blockExplorerConfig: BlockExplorerBlockscoutConfig;
  dispatcher?: Dispatcher;
}

export interface CreateEtherscanOptions {
  blockExplorerConfig: BlockExplorerEtherscanConfig;
  verificationProviderConfig: EtherscanConfig;
  chainId: number;
  dispatcher?: Dispatcher;
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

  getSupportedChains(): Promise<ChainDescriptorsConfig>;
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
