import type { BaseVerifyFunctionArgs } from "./types.js";

export interface EtherscanResponseBody {
  status: string;
  message: string;
  result: any;
}

export type EtherscanGetSourceCodeResponse =
  | EtherscanNotOkResponse
  | EtherscanGetSourceCodeOkResponse;

interface EtherscanGetSourceCodeOkResponse extends EtherscanResponseBody {
  status: "1";
  message: "OK";
  result: EtherscanContract[];
}

// TODO: maybe we don't need the complete contract interface
// and we can just use the SourceCode property
interface EtherscanContract {
  SourceCode: string;
  ABI: string;
  ContractName: string;
  CompilerVersion: string;
  OptimizationUsed: string;
  Runs: string;
  ConstructorArguments: string;
  EVMVersion: string;
  Library: string;
  LicenseType: string;
  Proxy: string;
  Implementation: string;
  SwarmSource: string;
  SimilarMatch: string;
}

export type EtherscanResponse = EtherscanNotOkResponse | EtherscanOkResponse;

interface EtherscanNotOkResponse extends EtherscanResponseBody {
  status: "0";
  message: "NOTOK";
  result: string;
}

interface EtherscanOkResponse extends EtherscanResponseBody {
  status: "1";
  message: "OK";
  result: string;
}

export interface EtherscanChainListResponse {
  comments: string;
  totalcount: string;
  result: Array<{
    chainname: string;
    chainid: string;
    blockexplorer: string;
    apiurl: string;
    status: number;
    comment: string;
  }>;
}

export interface EtherscanVerifyArgs extends BaseVerifyFunctionArgs {
  constructorArguments: string;
}

export type EtherscanCustomApiCallOptions =
  | {
      method: "GET";
    }
  | {
      method: "POST";
      body?: Record<string, unknown>;
    };

export interface LazyEtherscan {
  getChainId(): Promise<string>;
  getName(): Promise<string>;
  getUrl(): Promise<string>;
  getApiUrl(): Promise<string>;
  getApiKey(): Promise<string>;
  getContractUrl(address: string): Promise<string>;
  isVerified(address: string): Promise<boolean>;
  verify(args: EtherscanVerifyArgs): Promise<string>;
  pollVerificationStatus(
    guid: string,
    contractAddress: string,
    contractName: string,
  ): Promise<{ success: boolean; message: string }>;
  customApiCall(
    params: Record<string, unknown>,
    options?: EtherscanCustomApiCallOptions,
  ): Promise<EtherscanResponseBody>;
}
