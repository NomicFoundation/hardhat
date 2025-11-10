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

export type BlockscoutChainListResponse = Record<
  string,
  {
    name: string;
    description: string;
    logo: string;
    ecosystem: string | string[];
    isTestnet: boolean;
    layer: number;
    rollupType: string | null;
    // eslint-disable-next-line @typescript-eslint/naming-convention -- External API
    native_currency: string;
    website: string;
    explorers: Array<{
      url: string;
      hostedBy: string;
    }>;
  }
>;
