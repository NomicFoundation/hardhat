export type EtherscanGetSourceCodeResponse =
  | EtherscanNotOkResponse
  | EtherscanGetSourceCodeOkResponse;

interface EtherscanGetSourceCodeOkResponse {
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

interface EtherscanNotOkResponse {
  status: "0";
  message: "NOTOK";
  result: string;
}

interface EtherscanOkResponse {
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
