export type EtherscanGetSourceCodeResponse =
  | EtherscanGetSourceCodeNotOkResponse
  | EtherscanGetSourceCodeOkResponse;

interface EtherscanGetSourceCodeNotOkResponse {
  status: "0";
  message: "NOTOK";
  result: string;
}

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

export type EtherscanVerifySourceCodeResponse =
  | EtherscanVerifySourceCodeNotOkResponse
  | EtherscanVerifySourceCodeOkResponse;

interface EtherscanVerifySourceCodeNotOkResponse {
  status: "0";
  message: "NOTOK";
  result: string;
}

interface EtherscanVerifySourceCodeOkResponse {
  status: "1";
  message: "OK";
  result: string;
}
