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
