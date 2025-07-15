export type BlockscoutGetSourceCodeResponse =
  | BlockscoutNotOkResponse
  | BlockscoutGetSourceCodeOkResponse;

interface BlockscoutGetSourceCodeOkResponse {
  status: "1";
  message: "OK";
  result: BlockscoutContract[];
}

// TODO: maybe we don't need the complete contract interface
// and we can just use the SourceCode property
interface BlockscoutContract {
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

export type BlockscoutResponse = BlockscoutNotOkResponse | BlockscoutOkResponse;

interface BlockscoutNotOkResponse {
  status: "0";
  message: "NOTOK";
  result: string;
}

interface BlockscoutOkResponse {
  status: "1";
  message: "OK";
  result: string;
}
