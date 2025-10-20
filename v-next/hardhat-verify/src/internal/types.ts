import type { CompilerInput } from "hardhat/types/solidity";

export interface VerificationStatusResponse {
  isPending(): boolean;
  isFailure(): boolean;
  isSuccess(): boolean;
  isBytecodeMissingInNetworkError?(): boolean;
  isAlreadyVerified(): boolean;
  isOk(): boolean;
}

export interface VerificationResponse {
  isBytecodeMissingInNetworkError(): boolean;
  isAlreadyVerified(): boolean;
  isOk(): boolean;
}

export interface VerificationProvider {
  name: string;
  url: string;
  apiUrl: string;

  getContractUrl(address: string): string;

  isVerified(address: string): Promise<boolean>;

  verify(
    contractAddress: string,
    compilerInput: CompilerInput,
    contractName: string,
    compilerVersion: string,
    constructorArguments?: string,
  ): Promise<string>;

  pollVerificationStatus(
    guid: string,
    contractAddress: string,
    contractName: string,
  ): Promise<{
    success: boolean;
    message: string;
  }>;
}
